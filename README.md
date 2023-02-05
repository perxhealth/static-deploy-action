![Perx Health](https://user-images.githubusercontent.com/4101096/163123610-9dfa9263-1518-4f5d-8839-9ddc142a513e.png)

# Static Deploy to AWS

This repository contains a **GitHub Action** allowing you to deploy assets, such
as a static site, to an AWS S3 bucket.

It is also expected that the relevant bucket is behind a Cloudfront
Distribution, against which the Action creates an Invalidation after successful
deployment.

## Usage

Add the following `step` to a GitHub Actions workflow.

```yaml
- name: 🚀 Deploy
  uses: perxhealth/static-deploy-action@v1
  with:
    from: dist/
    to: s3://your-s3-bucket-uri
    cloudfront-distribution-id: KJPAKNWQ4OR54
```

### Inputs

The Action currently expects three required inputs, and no further optional
inputs.

1. `from`

   Path to a directory on local disk in which all files within will be uploaded,
   overwriting files in the S3 bucket with the same name.

2. `to`

   Fully qualified S3 remote path. Must start with `s3://`.

3. `cloudfront-distribution-id`

   Upon successful upload of the files nominated in `from`, this is the
   Cloudfront Distribution on which we'll create an `Invalidation`.

### Outputs

The Action currently produces no outputs.

## AWS Credentials

The Action currently expects AWS credentials to exist in the environment, with
sufficient permissions to perform the following actions.

### S3

- `ListObjects`
- `PutObject`
- `DeleteObject`

### Cloudfront

- `CreateInvalidation`

## Development

Follow the below steps to get up and running with a local, development copy
of the Action.

### Prerequisites

You will need the following tools installed on your machine.

- [Git](https://git-scm.com/)
- [asdf](https://github.com/asdf-vm/asdf)

### Clone the repository

```bash
$ git clone git@github.com:perxhealth/static-deploy-action
$ cd static-deploy-action
```

### Install dependencies

Firstly, you'll want to ensure the correct versions of the necessary system
dependencies are installed.

```bash
$ asdf install
```

_Note_: optionally, you may need to install the necessary [asdf](https://github.com/asdf-vm/asdf) plugins first.

```bash
$ asdf plugin add nodejs
$ asdf plugin add pnpm
```

Lastly, go ahead and install the Action's dependencies via `pnpm`

```bash
$ pnpm install
```

### Development

There's no server to run, or any particular commands to be aware of during
active development. The best way to make sure your changes behave as intended
is to write unit tests.

The repositories maintainers will take care of packaging and releasing new
versions after Pull Requests have been merged. Although, we plan to automate
this in future if there's enough demand.

### Testing

Ensure you write tests to cover any code or behaviour you introduce. The test
suite can be run with the following command...

```bash
$ pnpm test
```
