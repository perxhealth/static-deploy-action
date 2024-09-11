import assert from "node:assert"
import fs from "node:fs"
import { spawn } from "node:child_process"
import { emojify } from "node-emoji"

import * as core from "@actions/core"

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
      `Path specified in 'from' input does not exist: ${sourcePath}`,
    )

    // Perform some basic validation on `s3Path`
    assert(
      s3Path.startsWith("s3://"),
      "Path specified in 'to' input must start with 's3://'",
    )

    // Ensure AWS_ACCESS_KEY_ID was picked up from the environment
    assert(
      process.env.AWS_ACCESS_KEY_ID !== undefined,
      "`AWS_ACCESS_KEY_ID` is not set in the environment. Has a previous action setup AWS credentials?",
    )

    // Ensure AWS_SECRET_ACCESS_KEY was picked up from the environment
    assert(
      process.env.AWS_SECRET_ACCESS_KEY !== undefined,
      "`AWS_SECRET_ACCESS_KEY` is not set in the environment. Has a previous action setup AWS credentials?",
    )

    // Sync `from` input path up to `to` using `s3-client-sync` package
    await core.group(emojify(":arrows_clockwise: Sync assets"), async () => {
      return awscli("s3", ["sync", `${sourcePath}`, `${s3Path}`, "--delete"])
    })

    // Invalidate the Cloudfront distribution, so the newly uploaded
    // files will start being served
    await core.group(emojify(":sparkles: Bust the cache"), async () => {
      return awscli("cloudfront", [
        "create-invalidation",
        "--distribution-id",
        `${cfDistroId}`,
        "--paths",
        "/*",
      ])
    })
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

// Helper to shell out to AWS CLI with a Promise interface, and to
// stream stdout progress
type AWSCLIPromise = (service: string, args?: string[]) => Promise<void>

const awscli: AWSCLIPromise = (service, args = []) => {
  return new Promise((resolve, reject) => {
    const spawned = spawn("aws", [service, ...args])

    spawned.stdout.on("data", (data) => {
      console.log(data.toString())
    })
    spawned.stderr.on("data", (data) => {
      console.log(`error: ${data}`)
    })

    spawned.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject()
      }
    })
  })
}

run()
