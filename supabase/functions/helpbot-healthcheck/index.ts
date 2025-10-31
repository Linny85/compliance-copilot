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

    return {
      passed: hasAnswer,
      duration,
      answerLength,
      error: hasAnswer ? undefined : 'No answer received',
    };
  } catch (error: any) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function sendNotification(report: {
  timestamp: string;
  passed: number;
  failed: number;
  total: number;
  details: any[];
  duration: number;
}) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const status = report.failed === 0 ? '✅' : '⚠️';
    const subject = `NORRLY Health-Check ${status} [${report.passed}/${report.total}]`;
    
    const html = `
      <h2>${subject}</h2>
      <p><strong>Zeitstempel:</strong> ${report.timestamp}</p>
      <p><strong>Gesamtdauer:</strong> ${report.duration}ms</p>
      <p><strong>Erfolgreich:</strong> ${report.passed}</p>
      <p><strong>Fehlgeschlagen:</strong> ${report.failed}</p>
      
      <h3>Test Details:</h3>
      <ul>
        ${report.details.map(d => `
          <li>
            <strong>${d.name}</strong>: ${d.passed ? '✅ Bestanden' : '❌ Fehlgeschlagen'}
            <br/>Dauer: ${d.duration}ms
            ${d.answerLength ? `<br/>Antwortlänge: ${d.answerLength} Zeichen` : ''}
            ${d.error ? `<br/><span style="color: red;">Fehler: ${d.error}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    `;

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

    // Send notification
    await sendNotification(report);

    return new Response(
      JSON.stringify({
        success: true,
        report,
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
