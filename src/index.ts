import fs from "fs"
import assert from "assert"
import { emojify } from "node-emoji"

import * as core from "@actions/core"
import * as github from "@actions/github"

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
    const sourcePath = core.getInput("from", { required: true })
    const s3Path = core.getInput("to", { required: true })
    const cfDistroId = core.getInput("cloudfront-distribution-id", {
      required: true,
    })

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
    await core.group(emojify(":arrows_clockwise: Sync assets"), async () => {
      const s3Client = new S3Client({})
      const { sync } = new S3SyncClient({ client: s3Client })
      const { uploads, deletions } = await sync(sourcePath, s3Path, {
        del: true,
      })
      core.info(`Uploaded objects: ${uploads.length}`)
      core.info(`Deleted objects: ${deletions.length}`)
    })

    // Invalidate the Cloudfront distribution so updated files will be
    // served from the S3 bucket
    await core.group(emojify(":sparkles: Bust the cache"), async () => {
      const cf = new CloudFrontClient({})
      const result = await cf.send(
        new CreateInvalidationCommand({
          DistributionId: cfDistroId,
          InvalidationBatch: {
            CallerReference: github.context.sha,
            Paths: { Quantity: 1, Items: ["/*"] },
          },
        })
      )
      // Set the invalidation's ID as an output and finish up!
      core.info(`Invalidation ID: ${result.Invalidation?.Id}`)
      core.setOutput("cloudfront-invalidation-id", result.Invalidation?.Id)
    })
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
