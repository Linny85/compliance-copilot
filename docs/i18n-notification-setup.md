# i18n Notification Setup

## 🔔 Overview

This guide explains how to set up notifications for i18n-related CI failures, ensuring your team is immediately alerted when translation issues occur.

## 📧 Notification Options

### Option 1: GitHub Issues (Recommended)

Automatically create GitHub issues when i18n checks fail.

**Configuration:** Already included in `.github/workflows/i18n-health-check.yml` (commented out)

**To Enable:**

1. Uncomment the notification step in the workflow:

```yaml
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: '🚨 Weekly i18n Health Check Failed',
        body: `The weekly i18n health check failed on ${new Date().toISOString()}\n\nPlease review the [workflow run](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}) for details.`,
        labels: ['i18n', 'health-check', 'automated']
      })
```

2. Ensure your repository has appropriate labels:
   - `i18n`
   - `health-check`
   - `automated`

**Result:** Auto-created issues with links to failed workflow runs

---

### Option 2: Slack Notifications

Send messages to a Slack channel when checks fail.

**Prerequisites:**
- Slack workspace with incoming webhooks enabled
- Webhook URL from Slack

**Setup:**

1. Create a Slack App and get webhook URL:
   - Go to https://api.slack.com/apps
   - Create new app → From scratch
   - Add "Incoming Webhooks" feature
   - Create webhook for desired channel
   - Copy webhook URL

2. Add webhook URL to GitHub Secrets:
   - Repository → Settings → Secrets → Actions
   - Add new secret: `SLACK_WEBHOOK_URL`

3. Add step to workflow:

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1.25.0
  with:
    webhook-type: incoming-webhook
    webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "🚨 i18n Health Check Failed",
        "blocks": [
          {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": "🚨 i18n Health Check Failed"
            }
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Repository:* ${{ github.repository }}\n*Branch:* ${{ github.ref }}\n*Workflow:* <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>"
            }
          }
        ]
      }
```

**Result:** Instant Slack notifications with workflow links

---

### Option 3: Email Notifications

Send emails to team members when checks fail.

**Setup:**

1. Use GitHub Actions Email Action:

```yaml
- name: Send email notification
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: '🚨 i18n Health Check Failed - ${{ github.repository }}'
    to: team@example.com
    from: GitHub Actions
    body: |
      The i18n health check failed in ${{ github.repository }}.
      
      Workflow: ${{ github.workflow }}
      Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
      Branch: ${{ github.ref }}
      Commit: ${{ github.sha }}
      
      Please review the workflow logs for details.
```

2. Add email credentials to GitHub Secrets:
   - `EMAIL_USERNAME`
   - `EMAIL_PASSWORD` (use app-specific password for Gmail)

**Result:** Email alerts sent to specified addresses

---

### Option 4: Discord Notifications

Send messages to Discord channel when checks fail.

**Setup:**

1. Create Discord webhook:
   - Server Settings → Integrations → Webhooks
   - New Webhook → Copy URL

2. Add to GitHub Secrets:
   - Secret name: `DISCORD_WEBHOOK_URL`

3. Add step to workflow:

```yaml
- name: Notify Discord on failure
  if: failure()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK_URL }}
    status: ${{ job.status }}
    title: "i18n Health Check Failed"
    description: |
      🚨 Translation consistency check failed
      
      **Repository:** ${{ github.repository }}
      **Workflow:** [View Details](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
    color: 0xff0000
```

**Result:** Discord messages with embedded links

---

## 🎯 Notification Best Practices

### 1. Choose Appropriate Channels

- **Critical failures** → Slack/Discord (immediate attention)
- **Weekly reports** → Email (scheduled digests)
- **Documentation** → GitHub Issues (trackable history)

### 2. Avoid Notification Fatigue

```yaml
# Only notify on repeated failures
- name: Check if already notified
  id: check-notification
  run: |
    # Query GitHub API for existing open issues
    # Skip notification if issue already exists
```

### 3. Include Context

All notifications should include:
- ✅ Repository name
- ✅ Branch/commit info
- ✅ Direct link to workflow run
- ✅ Brief error summary
- ✅ Suggested action

### 4. Rate Limiting

```yaml
# Prevent spam by limiting notifications
- name: Rate limit check
  run: |
    # Only send notification if:
    # - No notification sent in last 4 hours
    # - Or critical severity detected
```

---

## 📊 Notification Templates

### Success Notification (Optional)

```yaml
- name: Notify success
  if: success()
  run: |
    echo "✅ All i18n checks passed - no notification needed"
    # Optionally send weekly summary of successful checks
```

### Detailed Failure Report

```yaml
- name: Generate detailed report
  if: failure()
  run: |
    cat << EOF > failure-report.md
    # i18n Check Failure Report
    
    **Date:** $(date -u)
    **Repository:** ${{ github.repository }}
    **Branch:** ${{ github.ref }}
    
    ## Failed Checks
    
    $(cat check-output.log)
    
    ## Next Steps
    
    1. Review the workflow logs
    2. Fix missing translation keys
    3. Re-run the checks
    
    [View Workflow Run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
    EOF
```

---

## 🧪 Testing Notifications

### Test GitHub Issue Creation

```bash
# Manually trigger workflow with failure
gh workflow run i18n-health-check.yml

# Or create a test failure
git checkout -b test/notification
# Make breaking change to i18n.ts
git commit -am "test: Trigger notification"
git push
```

### Test Slack Notification

```bash
# Send test webhook
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🧪 Test notification from i18n CI"
  }'
```

### Test Email

Use workflow dispatch with manual trigger:

```yaml
on:
  workflow_dispatch:
    inputs:
      test_email:
        description: 'Send test email'
        required: true
        type: boolean
```

---

## 📈 Monitoring Dashboard

### GitHub Actions Badge

Add to README.md:

```markdown
[![i18n Health Check](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/i18n-health-check.yml/badge.svg)](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/i18n-health-check.yml)
```

### Status Page Integration

For production deployments, integrate with:
- **StatusPage.io** - Incident management
- **Grafana** - Visualization dashboards
- **DataDog** - APM monitoring

---

## 🔧 Troubleshooting

### Notifications Not Sending

1. **Check secrets** are properly configured
2. **Verify webhook URLs** are valid
3. **Test connectivity** from GitHub Actions
4. **Review permissions** for GitHub App/Bot

### Too Many Notifications

1. **Add rate limiting** logic
2. **Increase check frequency** to reduce noise
3. **Combine multiple failures** into single notification
4. **Use digest mode** for scheduled reports

### Missing Context in Notifications

1. **Enhance payload** with more details
2. **Include error logs** in message body
3. **Add links** to documentation
4. **Suggest remediation steps**

---

## 📚 Related Documentation

- Workflow Configuration: `.github/workflows/i18n-health-check.yml`
- CI Setup Guide: `docs/i18n-ci-setup.md`
- Workflow Guide: `docs/i18n-workflow.md`
- GitHub Actions Docs: https://docs.github.com/actions

---

## 🎓 Next Steps

After setting up notifications:

1. ✅ Test all notification channels
2. ✅ Document team escalation procedures
3. ✅ Create runbook for common failures
4. ✅ Schedule regular review of notification effectiveness
5. ✅ Train team on responding to alerts
