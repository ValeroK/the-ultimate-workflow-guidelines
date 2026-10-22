# Skills: security

Read by `experts.js` only; no model reads this file. One section per stage. The order is the priority when the cap is reached. A line is `- <skill> (<selector>)`.

## plan

- personal-data-exposure

## review

- ci-workflow-security (files: .github/workflows/*.yml, .github/workflows/*.yaml, .github/workflows/actions.lock, **/action.yml, **/action.yaml)
- personal-data-exposure (added: \b(log(ger)?|logging|console|LOG)\.(debug|info|warn|warning|error|exception|log)\(.*\b(req\.body|request\.body|request\.data|req\.query|user|customer|patient|profile|payload|email|phone)\b|captureException|captureMessage|setUser\(|set_user\(|sendDefaultPii|send_default_pii|dataCollection|data_collection|beforeSend|before_send|beforeBreadcrumb|maskAllText|maskAllInputs|\.identify\(|analytics\.(page|track|identify)|posthog|mixpanel|amplitude|gtag\(|dataLayer\.push|fbq\(|localStorage\.setItem|sessionStorage\.setItem|ModelInvocationLogging|model_invocation_logging|DataProtectionPolicy|data_protection_policy|logs:Unmask|Sec-GPC|globalPrivacyControl|pg_restore|mongorestore|RestoreDBInstanceFromDBSnapshot|restore_db_instance_from_db_snapshot)
