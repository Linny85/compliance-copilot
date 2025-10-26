# Audit Report System - Implementation Documentation

## Overview

The Audit Report System provides automated generation, storage, and distribution of post-implementation audit reports in PDF format. The system is fully integrated with the NIS2 AI Guard platform and provides tenant-isolated, secure audit documentation.

## Architecture

### Components

1. **Database Layer** (`audit_tasks` table)
   - Stores audit task information
   - Tracks report generation timestamps
   - Links to generated PDF files in storage

2. **Storage Layer** (`reports` bucket)
   - Secure file storage for PDF reports
   - Tenant-isolated folder structure
   - RLS-protected access

3. **Edge Function** (`generate-audit-report`)
   - PDF generation using pdf-lib
   - File upload to storage
   - Email notification (optional)
   - Audit logging

4. **Frontend Components**
   - `/audit` - List view of all audit tasks
   - `/audit/new` - Create new audit task
   - `/audit/:id` - Detail view with editing and report generation
   - Dashboard widget - Recent reports overview

## Database Schema

### audit_tasks Table

```sql
CREATE TABLE public.audit_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  findings TEXT,
  corrective_actions TEXT,
  assigned_to UUID,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  report_generated_at TIMESTAMPTZ,
  last_report_path TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security

- Users can only access audit tasks within their tenant
- Authenticated users can create tasks for their tenant
- Tasks can be updated by any user in the same tenant

## Storage

### Bucket: `reports`

- **Access**: Private (not public)
- **File Size Limit**: 10MB
- **Allowed MIME Types**: `application/pdf`
- **Folder Structure**: `{tenant_id}/{audit_id}_{timestamp}.pdf`

### RLS Policies

```sql
-- Users can only access reports in their tenant folder
CREATE POLICY "Tenant-scoped reports access"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'reports' 
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Users can upload reports to their tenant folder
CREATE POLICY "Users can upload reports to tenant folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );
```

## Edge Function: generate-audit-report

### Endpoint

`POST /functions/v1/generate-audit-report`

### Request Body

```json
{
  "audit_id": "uuid",
  "tenant_id": "uuid",
  "user_email": "string",
  "send_email": boolean
}
```

### Response

```json
{
  "success": true,
  "path": "tenant_id/audit_id_timestamp.pdf",
  "file_name": "audit_id_timestamp.pdf"
}
```

### Process Flow

1. **Authentication**: Verifies request has valid service role key
2. **Data Retrieval**: Fetches audit task from database
3. **PDF Generation**: Creates formatted PDF using pdf-lib
4. **Storage Upload**: Saves PDF to `reports` bucket
5. **Database Update**: Updates `report_generated_at` and `last_report_path`
6. **Audit Logging**: Records event in `audit_log` table
7. **Email (Optional)**: Sends PDF via Postmark if requested

### PDF Format

- **Page Size**: A4 (595.28 x 841.89 points)
- **Fonts**: Helvetica, Helvetica-Bold
- **Sections**:
  - Header with title
  - Task information (title, status, priority, description)
  - Findings section
  - Corrective actions section
  - Footer with timestamp and tenant ID

## Frontend Usage

### Creating an Audit Task

```tsx
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase
  .from("audit_tasks")
  .insert({
    tenant_id: companyId,
    created_by: userId,
    title: "Q4 2024 Security Audit",
    description: "Post-implementation review of security controls",
    priority: "high",
    due_date: new Date("2024-12-31").toISOString(),
    status: "open",
  })
  .select()
  .single();
```

### Generating a Report

```tsx
const { data, error } = await supabase.functions.invoke("generate-audit-report", {
  body: {
    audit_id: taskId,
    tenant_id: tenantId,
    user_email: userEmail,
    send_email: false,
  },
});
```

### Downloading a Report

```tsx
const { data, error } = await supabase.storage
  .from("reports")
  .download(reportPath);

if (!error) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "audit_report.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
```

## Security Considerations

1. **Tenant Isolation**: All data access is scoped by tenant_id via RLS
2. **Authentication**: Edge function requires service role key
3. **Storage Access**: Private bucket with RLS-based folder access
4. **Audit Trail**: All report generations are logged in audit_log
5. **Email Security**: Optional feature requiring POSTMARK_TOKEN

## Testing

### Database Tests

```sql
-- Verify RLS policies
SELECT * FROM audit_tasks; -- Should only return tenant's tasks

-- Verify trigger
UPDATE audit_tasks SET title = 'Test' WHERE id = 'uuid';
-- Should update updated_at automatically
```

### Storage Tests

```typescript
// Test upload
const { error } = await supabase.storage
  .from("reports")
  .upload(`${tenantId}/test.pdf`, pdfBytes);

// Test download
const { data, error } = await supabase.storage
  .from("reports")
  .download(`${tenantId}/test.pdf`);
```

### Edge Function Tests

```bash
# Test with curl
curl -X POST https://PROJECT_ID.supabase.co/functions/v1/generate-audit-report \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "audit_id": "uuid",
    "tenant_id": "uuid",
    "user_email": "test@example.com",
    "send_email": false
  }'
```

## Monitoring

### Key Metrics

- **Report Generation Rate**: Number of reports generated per day
- **Storage Usage**: Total size of reports bucket
- **Generation Failures**: Error rate for PDF generation
- **Email Delivery**: Success rate for optional email notifications

### Audit Log Queries

```sql
-- Recent report generations
SELECT * FROM audit_log
WHERE action = 'audit_report.generated'
ORDER BY created_at DESC
LIMIT 10;

-- Reports by tenant
SELECT tenant_id, COUNT(*) as report_count
FROM audit_log
WHERE action = 'audit_report.generated'
GROUP BY tenant_id
ORDER BY report_count DESC;
```

## Future Enhancements

### Phase 2

1. **Scheduled Reports**: Automatic generation on specific dates
2. **Report Templates**: Customizable PDF layouts
3. **Digital Signatures**: Cryptographic signing of reports
4. **Bulk Export**: ZIP archives of multiple reports
5. **Report History**: Version tracking for audit tasks
6. **Advanced Analytics**: Dashboard for report insights
7. **Multi-language PDFs**: Localized report generation

### Integration Opportunities

- **Compliance Dashboard**: Link to compliance score tracking
- **Evidence Management**: Attach evidence files to reports
- **Notification System**: Alert stakeholders on report completion
- **Document Management**: Integration with existing docs system

## Troubleshooting

### Common Issues

**Problem**: Reports not generating
- **Check**: Edge function logs for errors
- **Verify**: pdf-lib dependency is available
- **Confirm**: Storage bucket permissions are correct

**Problem**: Cannot download reports
- **Check**: RLS policies on storage.objects
- **Verify**: User is authenticated
- **Confirm**: Report path is correct

**Problem**: Email not sending
- **Check**: POSTMARK_TOKEN environment variable
- **Verify**: Email address is valid
- **Confirm**: Postmark account is active

## Support

For issues or questions:
1. Check Edge function logs
2. Review audit_log for error details
3. Verify RLS policies are active
4. Contact system administrator

## Changelog

### v1.0.0 (2024-10-26)
- Initial release
- PDF generation with pdf-lib
- Tenant-isolated storage
- Optional email notifications
- Dashboard widget for recent reports
- Full audit logging
