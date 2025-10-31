import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TestCase {
  name: string;
  question: string;
  lang: string;
  module: string;
  session_id: string;
  expectation: string;
  expectIncludes?: string[];
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Test 1 – Modul Kontrollen',
    question: 'Was mache ich im Modul Kontrollen?',
    lang: 'de',
    module: 'controls',
    session_id: 'health-t1',
    expectation: 'App-bezogene Antwort mit praktischen Schritten'
  },
  {
    name: 'Test 2 – Legal-Guard greift',
    question: 'Erkläre die Kontrollen im Sinne der NIS2 Richtlinie im Modul Kontrollen.',
    lang: 'de',
    module: 'controls',
    session_id: 'health-t2',
    expectation: 'Keine Paragraphen/Artikel, nur App-Hinweise'
  },
  {
    name: 'Test 3 – Explizite Rechtsgrundlage erlaubt',
    question: 'Welche Rechtsgrundlage gilt für das Patch-Management in NIS2? Bitte mit Artikel.',
    lang: 'de',
    module: 'controls',
    session_id: 'health-t3',
    expectation: 'Juristische Referenz ist erlaubt'
  },
  {
    name: 'Test 4 – Memory (Teil 1)',
    question: 'Wie kann ich eine Kontrolle dokumentieren?',
    lang: 'de',
    module: 'controls',
    session_id: 'health-t4',
    expectation: 'Dokumentations-Hinweise'
  },
  {
    name: 'Test 5 – Memory (Teil 2)',
    question: 'Und wie sehe ich später, ob sie noch gültig ist?',
    lang: 'de',
    module: 'controls',
    session_id: 'health-t4',
    expectation: 'Kontextbewusste Antwort auf vorherige Frage'
  },
  {
    name: 'Test 6 – Knowledge: Was ist der NIS2 AI Guard?',
    question: 'Was ist der NIS2 AI Guard?',
    lang: 'de',
    module: 'global',
    session_id: 'healthcheck-nis2aiguard',
    expectation: 'NORRLY antwortet aus interner Wissensbasis mit Plattform-Identität',
    expectIncludes: [
      'SaaS-Plattform',
      'Norrland Innovate',
      'NORRLY',
      'Compliance'
    ]
  }
];

async function runTest(testCase: TestCase): Promise<{
  passed: boolean;
  duration: number;
  error?: string;
  answerLength?: number;
}> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/helpbot-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: testCase.question,
        lang: testCase.lang,
        module: testCase.module,
        session_id: testCase.session_id,
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      return {
        passed: false,
        duration,
        error: `HTTP ${response.status}: ${await response.text()}`,
      };
    }

    const data = await response.json();
    
    // Check if we got a valid answer
    const hasAnswer = data && data.answer && data.answer.length > 0;
    const answerLength = data?.answer?.length || 0;

    // Check expectIncludes if provided
    const expectIncludes = testCase.expectIncludes || [];
    const lowerAnswer = (data?.answer || '').toLowerCase();
    const allKeywordsPresent = expectIncludes.length === 0 || 
      expectIncludes.every(k => lowerAnswer.includes(k.toLowerCase()));
    
    const missingKeywords = expectIncludes.filter(k => !lowerAnswer.includes(k.toLowerCase()));

    return {
      passed: hasAnswer && allKeywordsPresent,
      duration,
      answerLength,
      error: hasAnswer
        ? allKeywordsPresent
          ? undefined
          : `Missing keywords: ${missingKeywords.join(', ')}`
        : 'No answer received',
    };
  } catch (error: any) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

function renderHtmlReport(subject: string, report: any, link?: string) {
  const statusColor = report.failed === 0 ? '#16a34a' : '#eab308';
  const pill = (ok: boolean) =>
    `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${ok ? '#e8f5e9' : '#fff7ed'};color:${ok ? '#16a34a' : '#ea580c'};font-weight:600">${ok ? 'PASS' : 'FAIL'}</span>`;

  const details = report.details.map((d: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${pill(d.passed)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.duration} ms</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.answerLength ?? '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;color:#b91c1c">${d.error ?? ''}</td>
    </tr>
  `).join('');

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:760px;margin:auto;padding:24px">
    <h2 style="margin:0 0 8px 0;color:#111">${subject}</h2>
    <p style="margin:0 0 16px 0;color:#444">
      <strong>Zeitstempel:</strong> ${report.timestamp}<br/>
      <strong>Status:</strong> <span style="color:${statusColor};font-weight:700">
        ${report.passed}/${report.total} Tests bestanden
      </span><br/>
      <strong>Dauer:</strong> ${report.duration} ms
      ${link ? `<br/><strong>JSON-Report:</strong> <a href="${link}" target="_blank" rel="noopener">Download</a>` : ''}
    </p>

    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Test</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Ergebnis</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Dauer</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Len.</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Fehler</th>
        </tr>
      </thead>
      <tbody>
        ${details}
      </tbody>
    </table>

    <p style="margin-top:16px;color:#666">
      NORRLY – integrierter Assistent im NIS2 AI Guard (Norrland Innovate AB).
    </p>
  </div>`;
}

async function sendNotification(report: {
  timestamp: string;
  passed: number;
  failed: number;
  total: number;
  details: any[];
  duration: number;
}, reportUrl?: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const status = report.failed === 0 ? '✅' : '⚠️';
    const subject = `NORRLY Health-Check ${status} [${report.passed}/${report.total}]`;
    
    const html = renderHtmlReport(subject, report, reportUrl);

    // Get admin emails
    const { data: admins } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
      .limit(10);

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: admin.email,
            subject,
            html,
          },
        });
      }
      console.log(`[NORRLY Health] Notification sent to ${admins.length} admin(s)`);
    } else {
      console.log('[NORRLY Health] No admins found to notify');
    }
  } catch (error: any) {
    console.error('[NORRLY Health] Failed to send notification:', error.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[NORRLY Health] Starting health check...');
  const startTime = Date.now();

  try {
    const results = [];
    let passed = 0;
    let failed = 0;

    // Run all tests sequentially to respect session_id for memory tests
    for (const testCase of TEST_CASES) {
      console.log(`[NORRLY Health] Running: ${testCase.name}`);
      const result = await runTest(testCase);
      
      results.push({
        name: testCase.name,
        passed: result.passed,
        duration: result.duration,
        answerLength: result.answerLength,
        error: result.error,
      });

      if (result.passed) {
        passed++;
      } else {
        failed++;
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const totalDuration = Date.now() - startTime;
    const report = {
      timestamp: new Date().toISOString(),
      passed,
      failed,
      total: TEST_CASES.length,
      details: results,
      duration: totalDuration,
    };

    console.log('[NORRLY Health] Report:', JSON.stringify(report, null, 2));

    // Archive report to storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const keyJson = `reports/${ts}.json`;
    
    let reportUrl: string | null = null;
    
    try {
      await supabase.storage
        .from('norrly-logs')
        .upload(keyJson, new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), {
          upsert: true
        });

      // Create presigned URL (7 days)
      const { data: signed } = await supabase
        .storage
        .from('norrly-logs')
        .createSignedUrl(keyJson, 7 * 24 * 60 * 60);
      
      reportUrl = signed?.signedUrl ?? null;
      console.log('[NORRLY Health] Report archived:', keyJson);
    } catch (storageError: any) {
      console.error('[NORRLY Health] Storage error:', storageError.message);
    }

    // Send notification with report URL
    await sendNotification(report, reportUrl ?? undefined);

    return new Response(
      JSON.stringify({
        success: true,
        report,
        last_report_url: reportUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[NORRLY Health] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
