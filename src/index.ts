import fs from "fs"
import assert from "assert"

import * as core from "@actions/core"
import { S3Client } from "@aws-sdk/client-s3"

import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront"

// @ts-expect-error no types here just yet
import S3SyncClient from "s3-sync-client"

async function run(): Promise<void> {
  try {
    // Retrieve all required inputs
    const sourcePath = core.getInput("from")
    const s3Path = core.getInput("to")
    const cfDistroId = core.getInput("cloudfront-distribution-id")

    // Perform some basic validation on `sourcePath`
    assert(
      fs.existsSync(sourcePath),
      `Path specified in 'from' input does not exist: ${sourcePath}`
    )

    // Perform some basic validation on `s3Path`
    assert(
      s3Path.startsWith("s3://"),
      `Path specified in 'to' input must start with 's3://'`
    )

    // Ensure AWS_ACCESS_KEY_ID was picked up from the environment
    assert(
      process.env.AWS_ACCESS_KEY_ID !== undefined,
      "`AWS_ACCESS_KEY_ID` is not set in the environment. Has a previous action setup AWS credentials?"
    )

    // Ensure AWS_SECRET_ACCESS_KEY was picked up from the environment
    assert(
      process.env.AWS_SECRET_ACCESS_KEY !== undefined,
      "`AWS_SECRET_ACCESS_KEY` is not set in the environment. Has a previous action setup AWS credentials?"
    )

    // Sync `from` input path up to `to` using `s3-client-sync` package
    const s3Client = new S3Client({})
    const { sync } = new S3SyncClient({ client: s3Client })
    await sync(s3Path, sourcePath, { del: true })

    // Invalidate the Cloudfront distribution so updated files will be
    // served from the S3 bucket
    const cf = new CloudFrontClient({})
    const result = await cf.send(
      new CreateInvalidationCommand({
        DistributionId: cfDistroId,
        InvalidationBatch: undefined,
      })
    )

    // Set the invalidation's ID as an output and finish up!
    core.setOutput("cloudfront-invalidation-id", result.Invalidation?.Id)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
