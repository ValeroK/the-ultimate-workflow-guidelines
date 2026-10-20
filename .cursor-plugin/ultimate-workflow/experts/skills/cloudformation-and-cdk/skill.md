# CloudFormation, SAM and CDK change safety

Use this when a change touches a CloudFormation or SAM template or a CDK app. It holds what decides whether a stack update keeps, replaces or deletes what is already running.

Each fact carries its source: **[G]** AWS's CloudFormation user guide as last published on GitHub (December 2023; the current guide was not reachable, so quotas may have changed); **[D]** the AWS CDK developer guide as published on GitHub (`awsdocs/aws-cdk-guide`, current in October 2026); **[R]** the maintainer's check of the live AWS pages (2026-10-20), which confirmed the DeletionPolicy, UpdateReplacePolicy, stack policy, change set and replacement-label facts below; **[T]** AWS's agent toolkit (2026), not checked against the guide; **[O]** our own reasoning. Whether a property change requires replacement is stated per property in the resource reference as "Update requires: Replacement" [R]; cite it or an attached change set or `cdk diff`, never memory.

## Identity: the logical ID

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| An update is no interruption, some interruption, or replacement; replacement gives a new physical ID, usually creating the new resource first and then deleting the old [G] | A changed property whose reference says "Replacement" on a database, bucket, table, volume or key | Stateless resources |
| A renamed logical ID in a template is a new resource and a deleted one [O] | A resource key renamed in `Resources:` | |
| In CDK the logical ID comes from the construct's path plus a hash; changing a construct ID, or moving the construct to another scope, replaces the resource [D] | A construct ID renamed, or a construct moved into a new construct or stack | Kept with `Default` as the child ID, remapped with `cdk refactor`, or pinned with `overrideLogicalId` [D] |
| A custom-named resource cannot be replaced; the update fails until it gets a new name [G] | A fixed physical name (`BucketName`, `TableName`, `FunctionName`) on a resource whose change requires replacement | Generated names |

## Deletion and replacement policies

- `DeletionPolicy` is `Delete` by default, except `Snapshot` for `AWS::RDS::DBCluster` and for an `AWS::RDS::DBInstance` without `DBClusterIdentifier`; the options are Delete, Retain, RetainExceptOnCreate and Snapshot [G]. A new stateful resource with no policy, or `Retain` changed to `Delete`, loses the data when the resource leaves the template [O].
- `DeletionPolicy: Retain` does not protect against replacement: the old resource is deleted completely. `UpdateReplacePolicy` is what keeps or snapshots it [G]. A stateful resource with `Retain` but no `UpdateReplacePolicy`, in a change that replaces it, is a finding.
- A retained resource removed from the template keeps running, unmanaged; adding it back with the same physical name fails [T].
- In CDK, resources that hold persistent data default to `RemovalPolicy.RETAIN`, which orphans them when the stack is destroyed [D]. `RemovalPolicy.DESTROY` or `autoDeleteObjects: true` on production data deletes it [O]. A non-empty S3 bucket is not deleted with `DESTROY` unless `autoDeleteObjects` is set [D].
- Termination protection is off by default and can be set only on the root stack; a stack update can still delete a nested stack [G]. A stack policy protects every resource unless allowed, applies only during updates, and is not access control [G].

## Cross-stack references

- An `Export` renamed or removed, or a CDK cross-stack reference dropped, while another stack still imports it, fails the update [T]. It needs several deploys: keep the export, move the importer off it, then remove it.
- A `Condition` shared by several resources, changed for one purpose, adds or deletes all of them [T].

## Change sets, drift and failed updates

- A change set shows `Replacement` as True or False, from the most intrusive `RequiresRecreation` of the changed properties [G]. It does not say whether the update will succeed [G].
- Drift detection only reports drift; fixing it is a template change and an update, or an import [G]. Nested stacks are not checked, and only properties set in the template are compared [G].
- A stack in `UPDATE_ROLLBACK_FAILED` cannot be updated until the rollback is continued [G]. A change that removes rollback (`--no-rollback`, `DisableRollback`) on a production path leaves a failed update half applied [O].
- CDK `--hotswap` deploys bypass CloudFormation for some resources and drift the stack; they are for development [T].

## Limits and context

- A template holds at most 500 resources and 200 each of parameters, outputs and mappings; the body is at most 51,200 bytes inline or 1 MB from S3 [G, 2023].
- Commit `cdk.json` and `cdk.context.json` [D]. A deleted or ignored context file makes lookups resolve differently in CI [O].
- Feature flags in `cdk.json` change construct behaviour; `cdk init` enables all flags of its release, and a project without a flag keeps the old behaviour [D]. A flag turned on in an existing app can replace resources: check `cdk diff`.
- Every account and Region must be bootstrapped before the first deploy [D].
- A dynamic reference to a secret is not kept in CloudFormation's logs, but rotating the secret does not update the stack; the resource must be updated [G].

## Lambda packages

A function's .zip package is at most 50 MB zipped for direct upload and 250 MB unzipped, layers and custom runtimes included; a function takes at most five layers [G, Lambda guide 2023]. A new dependency or layer that pushes a function past either fails the deploy, not the build [O].

## API Gateway REST APIs

A REST API change takes effect only when the API is redeployed to a stage [G, API Gateway guide 2023]. A template that changes methods or integrations but leaves the `AWS::ApiGateway::Deployment` resource unchanged leaves the old API live [O].
