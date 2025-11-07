export const translations = {
  en: {
    // Banner
    banner: {
      demoTitle: "Demo Mode:",
      demoText: "Data is stored temporarily only.",
      trialActive: "Trial version active – 14 days remaining",
    },
    // Auth
    auth: {
      title: "Welcome Back",
      signIn: "Sign In",
      signUp: "Sign Up",
      email: "Email",
      password: "Password",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      signInButton: "Sign in",
      signUpButton: "Create account",
      loading: "Loading...",
    },
    // Onboarding
    onboarding: {
      title: "Create Your Company",
      subtitle: "Set up your compliance workspace",
      companyName: "Company Name",
      legalName: "Legal Name (Optional)",
      street: "Street Address",
      zip: "ZIP Code",
      city: "City",
      country: "Country",
      sector: "Sector",
      companySize: "Company Size",
      website: "Website (Optional)",
      vatId: "VAT ID (Optional)",
      address: "Address",
      masterCode: "Master Code",
      masterCodeConfirm: "Confirm Master Code",
      deleteCode: "Delete Code",
      deleteCodeConfirm: "Confirm Delete Code",
      securityCodes: "Security Codes",
      securitySubtitle: "Set up secure access codes for company management",
      reviewTitle: "Review & Submit",
      reviewSubtitle: "Review your information before submitting",
      next: "Next",
      back: "Back",
      review: "Review",
      submit: "Create Company",
      submitting: "Creating Company...",
      securityNote: "Why are security codes important?",
      masterCodeDesc: "Used to manage users and company settings",
      deleteCodeDesc: "Emergency code for company reset",
      securityWarning: "Keep these codes secure - they grant full access to your company data",
      step1: "Company Info",
      step2: "Security",
      step3: "Review",
      generateCodes: "Generate Codes",
      selectSector: "Select sector",
      companyCreated: "Company created successfully",
      companyExistsInfo: "Company already exists, proceeding to dashboard",
    },
    // Sectors
    sectors: {
      technology: "Technology",
      finance: "Finance",
      healthcare: "Healthcare",
      energy: "Energy",
      transport: "Transport",
      other: "Other",
    },
    // Company Sizes
    companySize: {
      "1-10": "1-10 employees",
      "11-50": "11-50 employees",
      "51-200": "51-200 employees",
      "201-500": "201-500 employees",
      "501+": "501+ employees",
    },
    // Dashboard - loaded from JSON files in public/locales/*/dashboard.json
    // Admin
    admin: {
      title: "Admin",
      users: "Users",
      settings: "Settings",
    },
    // Documents
    documents: {
      title: "Documents",
      subtitle: "Generate and manage compliance documentation",
      generate: "Generate Document",
      comingSoon: "Document generation coming soon",
      comingSoonDesc: "Generate NIS2 policies, AI Act reports, and compliance certificates",
      generateTitle: "Generate Policy Document",
      generateSubtitle: "Create compliance documentation based on control requirements",
      generateButton: "Generate Document",
      generating: "Generating...",
      policyDocument: "Policy Document",
      selectedControl: "Selected Control",
      documentDetails: "Document Details",
      aiPoweredTitle: "AI-Powered Document Generation",
      aiPoweredDesc: "This feature uses AI to generate compliance documentation based on the selected control requirements. The generated document will include relevant policies, procedures, and implementation guidelines.",
      fields: {
        code: "Code",
        title: "Title",
        objective: "Objective",
        documentType: "Document Type",
        documentTitle: "Document Title",
        description: "Description",
      },
      types: {
        policy: "Policy Document",
        procedure: "Procedure",
        guideline: "Guideline",
        report: "Compliance Report",
      },
      placeholders: {
        title: "Enter document title...",
        description: "Enter document description or objectives...",
      },
      success: {
        generated: "Document Generated",
        generatedDesc: "Your policy document has been created successfully",
      },
      errors: {
        loadControl: "Failed to load control information",
        validation: "Validation Error",
        titleRequired: "Please provide a document title",
        generateFailed: "Generation Failed",
        generateFailedDesc: "Failed to generate the document. Please try again.",
      },
    },
    // NIS2
    nis2: {
      title: "NIS2 Compliance",
      risks: "Risks",
      subtitle: "Track and manage cybersecurity risks",
      addRisk: "Add Risk",
      createTitle: "Create New Risk",
      createDesc: "Document a new NIS2 cybersecurity risk",
      form: {
        titleLabel: "Risk Title *",
        descriptionLabel: "Description",
        riskLevelLabel: "Risk Level",
        statusLabel: "Status",
        mitigationPlanLabel: "Mitigation Plan",
        titlePlaceholder: "Unauthorized access to critical systems",
        descriptionPlaceholder: "Detailed description of the risk...",
        mitigationPlanPlaceholder: "Steps to mitigate this risk...",
      },
      riskLevels: {
        low: "Low",
        medium: "Medium",
        high: "High",
        critical: "Critical",
      },
      statuses: {
        open: "Open",
        in_progress: "In Progress",
        mitigated: "Mitigated",
        closed: "Closed",
      },
      actions: {
        create: "Create Risk",
        cancel: "Cancel",
        createFirst: "Create First Risk",
      },
      empty: {
        title: "No risks documented",
        desc: "Start managing your cybersecurity risks by creating your first risk entry",
        cta: "Create First Risk",
      },
      sections: {
        mitigationPlan: "Mitigation Plan:",
      },
    },
    // AI Act
    aiact: {
      title: "AI Act System Registry",
      systems: "AI Systems",
      emptyTitle: "No AI systems registered",
      emptyDesc: "Start documenting your AI systems for EU AI Act compliance",
      register: "Register System",
      registerFirst: "Register First System",
    },
    // Controls
    controls: {
      title: "Controls",
      subtitle: "Define and manage compliance controls across frameworks.",
      filters: {
        title: "Filters",
        allFrameworks: "All frameworks",
      },
      actions: {
        createPolicy: "Generate Policy",
        runAll: "Run All Checks",
      },
      labels: {
        objective: "Objective",
        evidenceTypes: "Evidence types",
        severity: "Severity",
      },
      empty: {
        noRules: "No controls defined yet",
      },
      catalog: {
        AI_ACT: {
          AI_01: {
            title: 'Data Governance',
            objective: 'Ensure data quality and governance for AI systems according to AI Act.'
          },
          AI_02: {
            title: 'Technical Documentation',
            objective: 'Maintain comprehensive technical documentation for AI systems.'
          },
          AI_03: {
            title: 'Risk Management',
            objective: 'Implement and maintain risk management systems for high-risk systems.'
          }
        },
        GDPR: {
          GDPR_01: {
            title: 'Legal Basis',
            objective: 'Ensure valid legal basis for all personal data processing.'
          },
          GDPR_02: {
            title: 'Information Obligation',
            objective: 'Provide clear and transparent information to data subjects.'
          },
          GDPR_03: {
            title: 'Data Subject Rights',
            objective: 'Ensure data subject rights according to GDPR art. 15–22.'
          }
        },
        NIS2: {
          NIS2_01: {
            title: 'Network Security',
            objective: 'Implement measures to secure network and information systems.'
          },
          NIS2_02: {
            title: 'Incident Management',
            objective: 'Establish processes for handling and reporting security incidents.'
          }
        }
      }
    },
    // Checks
    checks: {
      title: "Checks",
      subtitle: "Run automated compliance checks and review results.",
      tabs: {
        rules: "Rules",
        results: "Results",
      },
      actions: {
        newRule: "New Rule",
        runAll: "Run All",
        runSelected: "Run Selected",
      },
      empty: {
        noRules: "No rules configured yet",
        noResults: "No results available",
      },
      kind: {
        static: "Static",
        query: "Query",
        http: "HTTP",
        script: "Script",
      },
      outcome: {
        pass: "Pass",
        fail: "Fail",
        warn: "Warning",
      },
      status: {
        pending: "Pending",
        running: "Running",
        success: "Success",
        failed: "Failed",
        partial: "Partial",
      },
      success: {
        checks_run: "Checks started successfully",
        exported: "Results exported",
        exported_desc: "File downloaded",
      },
      errors: {
        load_failed: "Failed to load data",
        run_failed: "Failed to run checks",
        export_failed: "Export failed",
        noResultsToExport: "No results to export",
      },
      form: {
        new_rule_title: "Create New Check Rule",
        edit_rule_title: "Edit Rule",
        delete_confirm_title: "Delete Rule?",
        delete_confirm_text: "Are you sure you want to delete rule {{code}}?",
        hint: {
          sandbox: "Sandbox mode: SQL queries are read-only. Write access is blocked.",
        },
        success: {
          updated: "Rule updated",
          deleted: "Rule deleted",
          saved: "Rule saved successfully",
        },
        errors: {
          update_failed: "Update failed",
          delete_failed: "Delete failed",
          duplicate_code: "Rule code already exists",
          invalid_spec: "Invalid specification",
          invalid_json: "Spec is not valid JSON",
          save_failed: "Failed to save rule",
          unique_code: "This code is already in use",
          invalid_code: "Only A-Z, 0-9, -, _ (3-40 characters)",
          query_required: "Query is required",
          control_required: "Please select a control",
        },
        fields: {
          title: "Title",
          code: "Code",
          help_code: "Only A-Z, 0-9, -, _ (e.g. NIS2-BACKUP-AGE)",
          severity: "Severity",
          kind: "Type",
          enabled: "Enabled",
          description: "Description",
          control_id: "Associated Control",
          spec: "Specification",
          source: "Source",
          query: "Query",
          evaluator: "Evaluator",
          threshold: "Threshold",
          timeout_ms: "Timeout (ms)",
          metric_key: "Metric Key",
          aggregation: "Aggregation",
          pass_when: "Pass When",
          pass_value: "Comparison Value",
          owner_user_id: "Owner",
          tags: "Tags",
          schedule_cron: "Schedule (CRON)",
          remediation: "Remediation Note",
        },
        placeholders: {
          severity: "Select severity",
          kind: "Select type",
          control_id: "Select control...",
        },
        kinds: {
          static: "Static",
          query: "Query",
        },
        severities: {
          low: "Low",
          medium: "Medium",
          high: "High",
          critical: "Critical",
        },
        evaluators: {
          any_pass: "At least one match",
          all_pass: "All must pass",
          threshold: "Threshold",
        },
        aggregations: {
          latest: "Latest",
          avg: "Average",
          min: "Minimum",
          max: "Maximum",
          sum: "Sum",
        },
        pass_ops: {
          lte: "≤",
          lt: "<",
          gte: "≥",
          gt: ">",
          eq: "=",
          ne: "≠",
        },
        actions: {
          load_static_template: "Load Static Template",
          load_query_template: "Load Query Template",
          cancel: "Cancel",
          save: "Save",
          test: "Test Run",
        },
      },
      filters: {
        title: "Filters",
        reset: "Reset",
        dateRange: "Date Range",
        from: "From",
        to: "To",
        search: "Search",
        searchPlaceholder: "Search rules...",
        control: "Control",
        allControls: "All controls",
        severity: "Severity",
        outcome: "Outcome",
        status: "Status",
      },
      results: {
        time: "Time",
        rule: "Rule",
        outcome: "Outcome",
        runStatus: "Status",
        severity: "Severity",
        message: "Message",
        actions: "Actions",
        viewDetails: "View Details",
        copyViewLink: "Copy Link",
        copyViewLink_desc: "Link copied to clipboard",
        showing: "Showing {{from}}-{{to}} of {{total}}",
      },
      drilldown: {
        title: "Run Details",
        noData: "No data available",
        runId: "Run ID",
        windowStart: "Window Start",
        windowEnd: "Window End",
        control: "Control",
        details: "Details",
        rerun: "Rerun",
      },
      labels: {
        code: "Code",
        title: "Title",
        kind: "Type",
        severity: "Severity",
        enabled: "Active",
        schedule: "Schedule",
        control: "Control",
        outcome: "Outcome",
        message: "Message",
        time: "Time",
        status: "Status",
      },
      specEditor: {
        form: "Form",
        json: "JSON",
        metric: "Metric",
        metricPlaceholder: "e.g., cpu_usage",
        value: "Value",
        operator: "Operator",
        threshold: "Threshold",
        table: "Table",
      },
    },
    // Navigation
    nav: {
      dashboard: "Dashboard",
      risks: "NIS2 Risks",
      ai: "AI Systems",
      ai_systems: "AI Systems",
      controls: "Controls",
      scope: "Scope",
      evidence: "Evidence",
      checks: "Checks",
      audits: "Audits",
      docs: "Documents",
      documents: "Documents",
      reports: "Reports",
      organization: "Organization",
      integrations: "Integrations",
      helpbot_manager: "Helpbot Manager",
      certificates: "Certificates",
      admin: "Admin",
      help: "Help",
      logout: "Logout",
    },
    // Evidence
    evidence: {
      title: "Evidence",
      subtitle: "Manage requests and evidences for controls (NIS2, AI Act, GDPR).",
      tabs: {
        requests: "Requests",
        evidence: "Evidence",
      },
      actions: {
        newRequest: "Create request",
        save: "Save",
        cancel: "Cancel",
        upload: "Upload",
        review: "Review",
      },
      fields: {
        control: "Control",
        controlPlaceholder: "Select a control…",
        title: "Title",
        description: "Description",
        dueAt: "Due date",
        severity: "Priority",
        attach: "Attach file (optional)",
        file: "File",
        verdict: "Verdict",
        note: "Note",
      },
      severity: {
        low: "Low",
        medium: "Medium",
        high: "High",
        critical: "Critical",
      },
      status: {
        open: "Open",
        fulfilled: "Fulfilled",
        expired: "Expired",
        cancelled: "Cancelled",
      },
      verdict: {
        pending: "Pending",
        pass: "Approved",
        fail: "Rejected",
        warn: "Warning",
      },
      empty: {
        noRequests: "No open requests",
        noEvidence: "No evidence yet",
      },
      table: {
        colControl: "Control",
        colTitle: "Title",
        colStatus: "Status",
        colDue: "Due",
        colSeverity: "Priority",
      },
      success: {
        request_created: "Request created successfully",
        uploaded: "Evidence uploaded successfully",
        review_saved: "Review saved successfully",
      },
      errors: {
        create_failed: "Failed to create request",
        upload_failed: "Failed to upload evidence",
        review_failed: "Failed to save review",
      },
      validation: {
        controlRequired: "Please select a control.",
        titleRequired: "Title is required.",
      },
      types: {
        policy: 'Policy',
        documentation: 'Documentation',
        report: 'Report',
        log: 'Log',
        contract: 'Contract',
        certificate: 'Certificate',
        audit: 'Audit',
        assessment: 'Assessment'
      }
    },
    // Jurisdictions
    jurisdictions: {
      selectLabel: "Select legal framework",
      hint: "Choose the applicable jurisdiction – views & controls adapt accordingly.",
      suffix: " (GDPR + national law)",
    },
    // Training
    training: {
      title: "Compliance Training & Certificates",
      description: "Complete your trainings and manage certificates across frameworks.",
      hintBar: {
        text: "Courses are currently available in German on our website.",
        cta: "Open German course page"
      },
      notice: {
        deOnly: "These courses are currently available in German only."
      },
      courses: {
        nis2: {
          title: "NIS2 Compliance Certification",
          url: "https://myablefy.com/s/norrland-innovate/nis2-compliance-zertifizierung-6c5e3c3b",
          bullets: [
            "Implement 10 minimum measures",
            "Train incident response & reporting paths",
            "11 templates + 12-month updates"
          ]
        },
        lead: {
          title: "EU AI Act – Compliance for Companies",
          url: "https://myablefy.com/s/norrland-innovate/zertifizierter-online-kurs-eu-ki-gesetz-compliance-fuer-unternehmen-5b90e795",
          bullets: [
            "Understand risk classes & obligations",
            "CE conformity & documentation",
            "Implement AI literacy requirements"
          ]
        },
        emp: {
          title: "EU AI Act – Employee Training",
          url: "https://myablefy.com/s/norrland-innovate/eu-ai-act-mitarbeiter-schulung-866722a6",
          bullets: [
            "Do's & don'ts in daily work",
            "Data protection & bias explained",
            "Certificate after quiz"
          ]
        }
      },
      actions: {
        upload: "Upload certificate",
        verifyByCode: "Verify by code"
      },
      sections: {
        uploaded: {
          title: "Uploaded certificates",
          subtitle: "Review and verify submitted training certificates",
          empty: "No certificates available"
        }
      }
    },
    // AI Systems
    aiSystems: {
      register: {
        title: "Register AI System",
        description: "Document a new AI system for EU AI Act compliance.",
        fields: {
          system_name: "System Name",
          custom_name: "Custom name (optional)",
          custom_name_ph: "Enter a custom system name",
          description: "Description",
          purpose: "Purpose",
          risk: "Risk Classification",
          deployment: "Deployment Status"
        },
        presets: {
          label: "Quick presets",
          custom: "Other / Custom",
          hintText: "Select a common AI system to pre-fill fields or choose \"Custom\"."
        },
        actions: { 
          submit: "Register System",
          cancel: "Cancel"
        },
        success: "AI System registered successfully"
      },
      risk: { 
        minimal: "Minimal Risk", 
        limited: "Limited Risk", 
        high: "High Risk" 
      },
      deploy: { 
        planned: "Planned", 
        testing: "Testing", 
        live: "Live", 
        retired: "Retired" 
      }
    },
    // Common
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      loading: "Loading...",
      saving: "Saving...",
      error: "Error",
      success: "Success",
      required: "Required",
      optional: "Optional",
      confirm: "Confirm",
      language: "Language",
      fullName: "Full Name",
      orContinueWith: "Or continue with",
      disabled: "Disabled",
      previous: "Previous",
      next: "Next",
      viewCourse: "View course",
      tooltips: {
        adminOnly: "Admin access required",
        noRules: "No rules available",
      },
      severity: {
        low: "Low",
        medium: "Medium",
        high: "High",
        critical: "Critical",
      },
      forbidden: "Access Denied",
    },
    // Errors
    errors: {
      generic: "An error occurred. Please try again.",
    },
    // Validation
    validation: {
      required: "Please fill in all required fields",
      codesMismatch: "Codes don't match",
      masterCodeMismatch: "Master codes don't match",
      deleteCodeMismatch: "Delete codes don't match",
      codeLength: "Codes must be at least 8 characters long",
      emailInvalid: "Invalid email address",
    },
  },
  de: {
    // Banner
    banner: {
      demoTitle: "Demo-Modus:",
      demoText: "Daten werden nur temporär gespeichert.",
      trialActive: "Testversion aktiv – 14 Tage verbleiben",
    },
    // Auth
    auth: {
      title: "Willkommen zurück",
      signIn: "Anmelden",
      signUp: "Registrieren",
      email: "E-Mail",
      password: "Passwort",
      forgotPassword: "Passwort vergessen?",
      noAccount: "Noch kein Konto?",
      hasAccount: "Bereits ein Konto?",
      signInButton: "Anmelden",
      signUpButton: "Konto erstellen",
      loading: "Lädt...",
    },
    // Onboarding
    onboarding: {
      title: "Unternehmen erstellen",
      subtitle: "Richten Sie Ihren Compliance-Arbeitsbereich ein",
      companyName: "Firmenname",
      legalName: "Rechtlicher Name (Optional)",
      street: "Straße",
      zip: "Postleitzahl",
      city: "Stadt",
      country: "Land",
      sector: "Sektor",
      companySize: "Unternehmensgröße",
      website: "Website (Optional)",
      vatId: "USt-IdNr. (Optional)",
      address: "Adresse",
      masterCode: "Master-Code",
      masterCodeConfirm: "Master-Code bestätigen",
      deleteCode: "Lösch-Code",
      deleteCodeConfirm: "Lösch-Code bestätigen",
      securityCodes: "Sicherheitscodes",
      securitySubtitle: "Richten Sie sichere Zugriffscodes für die Unternehmensverwaltung ein",
      reviewTitle: "Überprüfen & Absenden",
      reviewSubtitle: "Überprüfen Sie Ihre Angaben vor dem Absenden",
      next: "Weiter",
      back: "Zurück",
      review: "Überprüfen",
      submit: "Unternehmen erstellen",
      submitting: "Unternehmen wird erstellt...",
      securityNote: "Warum sind Sicherheitscodes wichtig?",
      masterCodeDesc: "Wird verwendet, um Benutzer zu verwalten und Unternehmenseinstellungen anzupassen",
      deleteCodeDesc: "Notfall-Code für Unternehmenszurücksetzung",
      securityWarning: "Bewahren Sie diese Codes sicher auf - sie gewähren vollen Zugriff auf Ihre Unternehmensdaten",
      step1: "Unternehmensinfo",
      step2: "Sicherheit",
      step3: "Überprüfung",
      generateCodes: "Codes generieren",
      selectSector: "Sektor auswählen",
      companyCreated: "Unternehmen erfolgreich erstellt",
      companyExistsInfo: "Unternehmen existiert bereits, weiter zum Dashboard",
    },
    // Sectors
    sectors: {
      technology: "Technologie",
      finance: "Finanzen",
      healthcare: "Gesundheitswesen",
      energy: "Energie",
      transport: "Transport",
      other: "Sonstiges",
    },
    // Company Sizes
    companySize: {
      "1-10": "1-10 Mitarbeiter",
      "11-50": "11-50 Mitarbeiter",
      "51-200": "51-200 Mitarbeiter",
      "201-500": "201-500 Mitarbeiter",
      "501+": "501+ Mitarbeiter",
    },
    // Dashboard - loaded from JSON files in public/locales/*/dashboard.json
    // Admin
    admin: {
      title: "Verwaltung",
      users: "Benutzer",
      settings: "Einstellungen",
    },
    // Documents
    documents: {
      title: "Dokumente",
      subtitle: "Compliance-Dokumentation generieren und verwalten",
      generate: "Dokument generieren",
      comingSoon: "Dokumentengenerierung in Kürze verfügbar",
      comingSoonDesc: "Generieren Sie NIS2-Richtlinien, AI Act-Berichte und Konformitätszertifikate",
      generateTitle: "Policy-Dokument generieren",
      generateSubtitle: "Compliance-Dokumentation basierend auf Kontrollanforderungen erstellen",
      generateButton: "Dokument generieren",
      generating: "Generiert...",
      policyDocument: "Policy-Dokument",
      selectedControl: "Ausgewählte Kontrolle",
      documentDetails: "Dokumentdetails",
      aiPoweredTitle: "KI-gestützte Dokumentengenerierung",
      aiPoweredDesc: "Diese Funktion nutzt KI, um Compliance-Dokumentation basierend auf den ausgewählten Kontrollanforderungen zu generieren. Das generierte Dokument enthält relevante Richtlinien, Verfahren und Implementierungsleitfäden.",
      fields: {
        code: "Code",
        title: "Titel",
        objective: "Ziel",
        documentType: "Dokumenttyp",
        documentTitle: "Dokumenttitel",
        description: "Beschreibung",
      },
      types: {
        policy: "Policy-Dokument",
        procedure: "Verfahren",
        guideline: "Leitfaden",
        report: "Compliance-Bericht",
      },
      placeholders: {
        title: "Dokumenttitel eingeben...",
        description: "Dokumentbeschreibung oder Ziele eingeben...",
      },
      success: {
        generated: "Dokument generiert",
        generatedDesc: "Ihr Policy-Dokument wurde erfolgreich erstellt",
      },
      errors: {
        loadControl: "Kontrollinformationen konnten nicht geladen werden",
        validation: "Validierungsfehler",
        titleRequired: "Bitte geben Sie einen Dokumenttitel an",
        generateFailed: "Generierung fehlgeschlagen",
        generateFailedDesc: "Das Dokument konnte nicht generiert werden. Bitte versuchen Sie es erneut.",
      },
    },
    // NIS2
    nis2: {
      title: "NIS2-Compliance",
      risks: "Risiken",
      subtitle: "Cybersicherheitsrisiken nachverfolgen und verwalten",
      addRisk: "Risiko hinzufügen",
      createTitle: "Neues Risiko erstellen",
      createDesc: "Ein neues NIS2-Cybersicherheitsrisiko dokumentieren",
      form: {
        titleLabel: "Risikotitel *",
        descriptionLabel: "Beschreibung",
        riskLevelLabel: "Risikostufe",
        statusLabel: "Status",
        mitigationPlanLabel: "Maßnahmenplan",
        titlePlaceholder: "Unbefugter Zugriff auf kritische Systeme",
        descriptionPlaceholder: "Detaillierte Beschreibung des Risikos...",
        mitigationPlanPlaceholder: "Schritte zur Risikominderung...",
      },
      riskLevels: {
        low: "Niedrig",
        medium: "Mittel",
        high: "Hoch",
        critical: "Kritisch",
      },
      statuses: {
        open: "Offen",
        in_progress: "In Bearbeitung",
        mitigated: "Mitigiert",
        closed: "Geschlossen",
      },
      actions: {
        create: "Risiko erstellen",
        cancel: "Abbrechen",
        createFirst: "Erstes Risiko erstellen",
      },
      empty: {
        title: "Keine Risiken dokumentiert",
        desc: "Beginnen Sie mit dem Management Ihrer Cybersicherheitsrisiken, indem Sie Ihren ersten Eintrag erstellen",
        cta: "Erstes Risiko erstellen",
      },
      sections: {
        mitigationPlan: "Maßnahmenplan:",
      },
    },
    // AI Act
    aiact: {
      title: "KI-Gesetz-Systemregister",
      systems: "KI-Systeme",
      emptyTitle: "Keine KI-Systeme registriert",
      emptyDesc: "Beginnen Sie mit der Dokumentation Ihrer KI-Systeme für die EU-KI-Gesetz-Konformität",
      register: "System registrieren",
      registerFirst: "Erstes System registrieren",
    },
    // Controls
    controls: {
      title: "Maßnahmen",
      subtitle: "Definieren und verwalten Sie Compliance-Maßnahmen über Frameworks hinweg.",
      filters: {
        title: "Filter",
        allFrameworks: "Alle Frameworks",
      },
      actions: {
        createPolicy: "Richtlinie generieren",
        runAll: "Alle Prüfungen ausführen",
      },
      labels: {
        objective: "Ziel",
        evidenceTypes: "Evidenztypen",
        severity: "Schweregrad",
      },
      empty: {
        noRules: "Noch keine Maßnahmen definiert",
      },
      catalog: {
        AI_ACT: {
          AI_01: {
            title: 'Daten-Governance',
            objective: 'Sicherstellung von Datenqualität und -verwaltung für KI-Systeme gemäß KI-Verordnung.'
          },
          AI_02: {
            title: 'Technische Dokumentation',
            objective: 'Führung umfassender technischer Dokumentation für KI-Systeme.'
          },
          AI_03: {
            title: 'Risikomanagement',
            objective: 'Implementierung und Wartung von Risikomanagementsystemen für Hochrisikosysteme.'
          }
        },
        GDPR: {
          GDPR_01: {
            title: 'Rechtsgrundlage',
            objective: 'Sicherstellung gültiger Rechtsgrundlagen für alle Datenverarbeitungen.'
          },
          GDPR_02: {
            title: 'Informationspflicht',
            objective: 'Bereitstellung klarer und transparenter Informationen für Betroffene.'
          },
          GDPR_03: {
            title: 'Betroffenenrechte',
            objective: 'Gewährleistung der Betroffenenrechte gemäß DSGVO Art. 15–22.'
          }
        },
        NIS2: {
          NIS2_01: {
            title: 'Netzwerksicherheit',
            objective: 'Implementierung von Maßnahmen zur Sicherung von Netzwerk- und Informationssystemen.'
          },
          NIS2_02: {
            title: 'Vorfallmanagement',
            objective: 'Etablierung von Prozessen zur Handhabung und Meldung von Sicherheitsvorfällen.'
          }
        }
      }
    },
    // Checks
    checks: {
      title: "Prüfungen",
      subtitle: "Automatisierte Compliance-Prüfungen ausführen und Ergebnisse prüfen.",
      tabs: {
        rules: "Regeln",
        results: "Ergebnisse",
      },
      actions: {
        newRule: "Neue Regel",
        runAll: "Alles ausführen",
        runSelected: "Ausgewählte ausführen",
      },
      empty: {
        noRules: "Noch keine Regeln konfiguriert",
        noResults: "Keine Ergebnisse verfügbar",
      },
      kind: {
        static: "Statisch",
        query: "Abfrage",
        http: "HTTP",
        script: "Skript",
      },
      outcome: {
        pass: "Bestanden",
        fail: "Fehlgeschlagen",
        warn: "Warnung",
      },
      status: {
        pending: "Ausstehend",
        running: "Läuft",
        success: "Erfolgreich",
        failed: "Fehlgeschlagen",
        partial: "Teilweise",
      },
      success: {
        checks_run: "Prüfungen erfolgreich gestartet",
        exported: "Ergebnisse exportiert",
        exported_desc: "Datei heruntergeladen",
      },
      errors: {
        load_failed: "Fehler beim Laden der Daten",
        run_failed: "Fehler beim Ausführen der Prüfungen",
        export_failed: "Export fehlgeschlagen",
        noResultsToExport: "Keine Ergebnisse zum Exportieren",
      },
      form: {
        new_rule_title: "Neue Prüfregel",
        edit_rule_title: "Regel bearbeiten",
        delete_confirm_title: "Regel löschen?",
        delete_confirm_text: "Möchten Sie die Regel \"{{code}}\" wirklich löschen?",
        hint: {
          sandbox: "SQL ist im Sandbox-Runner read-only. Schreibzugriffe sind blockiert.",
        },
        success: {
          updated: "Regel aktualisiert",
          deleted: "Regel gelöscht",
          saved: "Regel erfolgreich gespeichert",
        },
        errors: {
          update_failed: "Aktualisierung fehlgeschlagen",
          delete_failed: "Löschen fehlgeschlagen",
          duplicate_code: "Regelcode existiert bereits",
          invalid_spec: "Ungültige Spezifikation",
          invalid_json: "Spec ist kein gültiges JSON",
          save_failed: "Regel konnte nicht gespeichert werden",
          unique_code: "Dieser Code ist bereits vergeben",
          invalid_code: "Nur A-Z, 0-9, -, _ (3-40 Zeichen)",
          query_required: "Abfrage erforderlich",
          control_required: "Bitte ein Control auswählen",
        },
        fields: {
          title: "Titel",
          code: "Code",
          help_code: "Nur A-Z, 0-9, -, _ (z. B. NIS2-BACKUP-AGE)",
          severity: "Schweregrad",
          kind: "Art der Regel",
          enabled: "Aktiv",
          description: "Beschreibung",
          control_id: "Zugehöriges Control",
          spec: "Spezifikation",
          source: "Quelle",
          query: "Abfrage",
          evaluator: "Auswertung",
          threshold: "Schwellwert",
          timeout_ms: "Timeout (ms)",
          metric_key: "Metrik-Key",
          aggregation: "Aggregation",
          pass_when: "Bestanden wenn",
          pass_value: "Vergleichswert",
          owner_user_id: "Owner",
          tags: "Tags",
          schedule_cron: "Zeitplan (CRON)",
          remediation: "Hinweis zur Behebung",
        },
        placeholders: {
          severity: "Schweregrad wählen",
          kind: "Typ wählen",
          control_id: "Control wählen...",
        },
        kinds: {
          static: "Statisch",
          query: "Abfrage",
        },
        severities: {
          low: "Niedrig",
          medium: "Mittel",
          high: "Hoch",
          critical: "Kritisch",
        },
        evaluators: {
          any_pass: "Mindestens ein Treffer",
          all_pass: "Alle müssen passen",
          threshold: "Schwellwert",
        },
        aggregations: {
          latest: "Letzter",
          avg: "Durchschnitt",
          min: "Minimum",
          max: "Maximum",
          sum: "Summe",
        },
        pass_ops: {
          lte: "≤",
          lt: "<",
          gte: "≥",
          gt: ">",
          eq: "=",
          ne: "≠",
        },
        actions: {
          load_static_template: "Statische Vorlage laden",
          load_query_template: "Query-Vorlage laden",
          cancel: "Abbrechen",
          save: "Speichern",
          test: "Testlauf",
        },
      },
      filters: {
        title: "Filter",
        reset: "Zurücksetzen",
        dateRange: "Datumsbereich",
        from: "Von",
        to: "Bis",
        search: "Suchen",
        searchPlaceholder: "Regeln suchen...",
        control: "Kontrolle",
        allControls: "Alle Kontrollen",
        severity: "Schweregrad",
        outcome: "Ergebnis",
        status: "Status",
      },
      results: {
        time: "Zeit",
        rule: "Regel",
        outcome: "Ergebnis",
        runStatus: "Status",
        severity: "Schweregrad",
        message: "Nachricht",
        actions: "Aktionen",
        viewDetails: "Details ansehen",
        copyViewLink: "Link kopieren",
        copyViewLink_desc: "Link in Zwischenablage kopiert",
        showing: "Zeige {{from}}-{{to}} von {{total}}",
      },
      drilldown: {
        title: "Laufdetails",
        noData: "Keine Daten verfügbar",
        runId: "Lauf-ID",
        windowStart: "Fenster Start",
        windowEnd: "Fenster Ende",
        control: "Kontrolle",
        details: "Details",
        rerun: "Erneut ausführen",
      },
      labels: {
        code: "Code",
        title: "Titel",
        kind: "Typ",
        severity: "Schweregrad",
        enabled: "Aktiv",
        schedule: "Zeitplan",
        control: "Kontrolle",
        outcome: "Ergebnis",
        message: "Nachricht",
        time: "Zeit",
        status: "Status",
      },
      specEditor: {
        form: "Formular",
        json: "JSON",
        metric: "Metrik",
        metricPlaceholder: "z.B. cpu_usage",
        value: "Wert",
        operator: "Operator",
        threshold: "Schwellenwert",
        table: "Tabelle",
      },
    },
    // Navigation
    nav: {
      dashboard: "Dashboard",
      risks: "NIS2 Risiken",
      ai: "KI-Systeme",
      ai_systems: "KI-Systeme",
      controls: "Maßnahmen",
      scope: "Geltungsbereich",
      evidence: "Nachweise",
      checks: "Prüfungen (auto)",
      audits: "Audit",
      docs: "Dokumente",
      documents: "Dokumente",
      reports: "Berichte",
      organization: "Organisation",
      integrations: "Integrationen",
      helpbot_manager: "Helpbot Manager",
      certificates: "Zertifikate",
      admin: "Admin",
      help: "Hilfe",
      logout: "Abmelden",
    },
    // Evidence
    evidence: {
      title: "Nachweise",
      subtitle: "Verwalte Anfragen und Nachweise zu Kontrollen (NIS2, KI-Act, GDPR).",
      tabs: {
        requests: "Anfragen",
        evidence: "Evidenzen",
      },
      actions: {
        newRequest: "Neue Anfrage erstellen",
        save: "Speichern",
        cancel: "Abbrechen",
        upload: "Hochladen",
        review: "Prüfen",
      },
      fields: {
        control: "Kontrolle",
        controlPlaceholder: "Kontrolle auswählen …",
        title: "Titel",
        description: "Beschreibung",
        dueAt: "Fällig bis",
        severity: "Priorität",
        attach: "Datei anhängen (optional)",
        file: "Datei",
        verdict: "Urteil",
        note: "Notiz",
      },
      severity: {
        low: "Niedrig",
        medium: "Mittel",
        high: "Hoch",
        critical: "Kritisch",
      },
      status: {
        open: "Offen",
        fulfilled: "Erfüllt",
        expired: "Abgelaufen",
        cancelled: "Storniert",
      },
      verdict: {
        pending: "Ausstehend",
        pass: "Genehmigt",
        fail: "Abgelehnt",
        warn: "Warnung",
      },
      empty: {
        noRequests: "Keine offenen Anfragen",
        noEvidence: "Keine Nachweise vorhanden",
      },
      table: {
        colControl: "Kontrolle",
        colTitle: "Titel",
        colStatus: "Status",
        colDue: "Fällig",
        colSeverity: "Priorität",
      },
      success: {
        request_created: "Anfrage wurde erstellt",
        uploaded: "Nachweis wurde hochgeladen",
        review_saved: "Prüfung wurde gespeichert",
      },
      errors: {
        create_failed: "Anfrage konnte nicht erstellt werden",
        upload_failed: "Nachweis konnte nicht hochgeladen werden",
        review_failed: "Prüfung konnte nicht gespeichert werden",
      },
      validation: {
        controlRequired: "Bitte eine Kontrolle auswählen.",
        titleRequired: "Titel ist erforderlich.",
      },
      types: {
        policy: 'Richtlinie',
        documentation: 'Dokumentation',
        report: 'Bericht',
        log: 'Protokoll',
        contract: 'Vertrag',
        certificate: 'Zertifikat',
        audit: 'Audit',
        assessment: 'Bewertung'
      }
    },
    // Jurisdictions
    jurisdictions: {
      selectLabel: "Rechtsrahmen auswählen",
      hint: "Wählen Sie den geltenden Rechtsrahmen – Anzeigen & Kontrollen passen sich an.",
      suffix: " (GDPR + nationales Recht)",
    },
    // Training
    training: {
      title: "Schulungen & Zertifikate",
      description: "Absolviere Schulungen und verwalte Zertifikate über alle Frameworks.",
      hintBar: {
        text: "Noch kein Zertifikat? Buchen Sie jetzt eine Schulung bei Norrland Innovate.",
        cta: "Zu den Kursen"
      },
      notice: {
        deOnly: "Die Kursübersicht ist in Ihrer aktuellen Sprache nicht verfügbar."
      },
      courses: {
        nis2: {
          title: "NIS2 Compliance Zertifizierung",
          url: "https://myablefy.com/s/norrland-innovate/nis2-compliance-zertifizierung-6c5e3c3b",
          bullets: [
            "10 Mindestmaßnahmen umsetzen",
            "Incident-Response & Meldewege trainieren",
            "11 Vorlagen + 12-Monats-Updates"
          ]
        },
        lead: {
          title: "EU KI Gesetz – Compliance für Unternehmen",
          url: "https://myablefy.com/s/norrland-innovate/zertifizierter-online-kurs-eu-ki-gesetz-compliance-fuer-unternehmen-5b90e795",
          bullets: [
            "Risikoklassen & Pflichten verstehen",
            "CE-Konformität & Dokumentation",
            "AI-Literacy-Pflichten umsetzen"
          ]
        },
        emp: {
          title: "EU KI Gesetz – Mitarbeiterschulung",
          url: "https://myablefy.com/s/norrland-innovate/eu-ai-act-mitarbeiter-schulung-866722a6",
          bullets: [
            "Do's & Don'ts im Arbeitsalltag",
            "Datenschutz & Bias verständlich erklärt",
            "Teilnahmezertifikat nach Quiz"
          ]
        }
      },
      actions: {
        upload: "Zertifikat hochladen",
        verifyByCode: "Per Code verifizieren"
      },
      sections: {
        uploaded: {
          title: "Hochgeladene Zertifikate",
          subtitle: "Überprüfen und verifizieren Sie eingereichte Schulungszertifikate",
          empty: "Keine Zertifikate vorhanden"
        }
      }
    },
    // AI Systems
    aiSystems: {
      register: {
        title: "KI-System registrieren",
        description: "Dokumentiere ein neues KI-System zur EU-KI-Gesetz-Compliance.",
        fields: {
          system_name: "Systemname",
          custom_name: "Eigener Name (optional)",
          custom_name_ph: "Eigenen Systemnamen eingeben",
          description: "Beschreibung",
          purpose: "Zweck",
          risk: "Risikoklassifizierung",
          deployment: "Bereitstellungsstatus"
        },
        presets: {
          label: "Schnellvorlagen",
          custom: "Anderes / Eigenes",
          hintText: "Wähle eine Vorlage zur Vorbefüllung oder \"Eigenes\"."
        },
        actions: { 
          submit: "System registrieren",
          cancel: "Abbrechen"
        },
        success: "KI-System erfolgreich registriert"
      },
      risk: { 
        minimal: "Minimales Risiko", 
        limited: "Begrenztes Risiko", 
        high: "Hohes Risiko" 
      },
      deploy: { 
        planned: "Geplant", 
        testing: "Testbetrieb", 
        live: "Live", 
        retired: "Außer Betrieb" 
      }
    },
    // Common
    common: {
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      edit: "Bearbeiten",
      loading: "Lädt...",
      saving: "Speichert...",
      error: "Fehler",
      success: "Erfolg",
      required: "Erforderlich",
      optional: "Optional",
      confirm: "Bestätigen",
      language: "Sprache",
      fullName: "Vollständiger Name",
      orContinueWith: "Oder fortfahren mit",
      disabled: "Deaktiviert",
      previous: "Zurück",
      next: "Weiter",
      viewCourse: "Kurs ansehen",
      tooltips: {
        adminOnly: "Admin-Zugriff erforderlich",
        noRules: "Keine Regeln verfügbar",
      },
      severity: {
        low: "Niedrig",
        medium: "Mittel",
        high: "Hoch",
        critical: "Kritisch",
      },
      forbidden: "Zugriff verweigert",
    },
    // Errors
    errors: {
      generic: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    },
    // Validation
    validation: {
      required: "Bitte füllen Sie alle erforderlichen Felder aus",
      codesMismatch: "Codes stimmen nicht überein",
      masterCodeMismatch: "Master-Codes stimmen nicht überein",
      deleteCodeMismatch: "Lösch-Codes stimmen nicht überein",
      codeLength: "Codes müssen mindestens 8 Zeichen lang sein",
      emailInvalid: "Ungültige E-Mail-Adresse",
    },
  },
  sv: {
    // Banner
    banner: {
      demoTitle: "Demoläge:",
      demoText: "Data lagras endast tillfälligt.",
      trialActive: "Testversion aktiv – 14 dagar kvar",
    },
    // Auth
    auth: {
      title: "Välkommen tillbaka",
      signIn: "Logga in",
      signUp: "Registrera",
      email: "E-post",
      password: "Lösenord",
      forgotPassword: "Glömt lösenord?",
      noAccount: "Har du inget konto?",
      hasAccount: "Har du redan ett konto?",
      signInButton: "Logga in",
      signUpButton: "Skapa konto",
      loading: "Laddar...",
    },
    // Onboarding
    onboarding: {
      title: "Skapa ditt företag",
      subtitle: "Konfigurera din compliance-arbetsyta",
      companyName: "Företagsnamn",
      legalName: "Juridiskt namn (Valfritt)",
      street: "Gatuadress",
      zip: "Postnummer",
      city: "Stad",
      country: "Land",
      sector: "Sektor",
      companySize: "Företagsstorlek",
      website: "Webbplats (Valfritt)",
      vatId: "Momsnr (Valfritt)",
      address: "Adress",
      masterCode: "Huvudkod",
      masterCodeConfirm: "Bekräfta huvudkod",
      deleteCode: "Raderingskod",
      deleteCodeConfirm: "Bekräfta raderingskod",
      securityCodes: "Säkerhetskoder",
      securitySubtitle: "Ställ in säkra åtkomstkoder för företagshantering",
      reviewTitle: "Granska & skicka",
      reviewSubtitle: "Granska din information innan du skickar",
      next: "Nästa",
      back: "Tillbaka",
      review: "Granska",
      submit: "Skapa företag",
      submitting: "Skapar företag...",
      securityNote: "Varför är säkerhetskoder viktiga?",
      masterCodeDesc: "Används för att hantera användare och företagsinställningar",
      deleteCodeDesc: "Nödkod för företagsåterställning",
      securityWarning: "Håll dessa koder säkra - de ger full åtkomst till din företagsdata",
      step1: "Företagsinfo",
      step2: "Säkerhet",
      step3: "Granska",
      generateCodes: "Generera koder",
      selectSector: "Välj sektor",
      companyCreated: "Företag skapat framgångsrikt",
      companyExistsInfo: "Företaget finns redan, fortsätter till instrumentpanelen",
    },
    // Sectors
    sectors: {
      technology: "Teknik",
      finance: "Finans",
      healthcare: "Hälsovård",
      energy: "Energi",
      transport: "Transport",
      other: "Övrigt",
    },
    // Company Sizes
    companySize: {
      "1-10": "1-10 anställda",
      "11-50": "11-50 anställda",
      "51-200": "51-200 anställda",
      "201-500": "201-500 anställda",
      "501+": "501+ anställda",
    },
    // Dashboard - loaded from JSON files in public/locales/*/dashboard.json
    // Admin
    admin: {
      title: "Admin",
      users: "Användare",
      settings: "Inställningar",
    },
    // Documents
    documents: {
      title: "Dokument",
      subtitle: "Skapa och hantera compliance-dokumentation",
      generate: "Skapa dokument",
      comingSoon: "Dokumentgenerering kommer snart",
      comingSoonDesc: "Skapa NIS2-policyer, AI Act-rapporter och efterlevnadscertifikat",
      generateTitle: "Generera policydokument",
      generateSubtitle: "Skapa compliance-dokumentation baserat på kontrollkrav",
      generateButton: "Generera dokument",
      generating: "Genererar...",
      policyDocument: "Policydokument",
      selectedControl: "Vald kontroll",
      documentDetails: "Dokumentdetaljer",
      aiPoweredTitle: "AI-driven dokumentgenerering",
      aiPoweredDesc: "Denna funktion använder AI för att generera compliance-dokumentation baserat på de valda kontrollkraven. Det genererade dokumentet kommer att innehålla relevanta policys, procedurer och implementeringsriktlinjer.",
      fields: {
        code: "Kod",
        title: "Titel",
        objective: "Syfte",
        documentType: "Dokumenttyp",
        documentTitle: "Dokumenttitel",
        description: "Beskrivning",
      },
      types: {
        policy: "Policydokument",
        procedure: "Procedur",
        guideline: "Riktlinje",
        report: "Compliance-rapport",
      },
      placeholders: {
        title: "Ange dokumenttitel...",
        description: "Ange dokumentbeskrivning eller mål...",
      },
      success: {
        generated: "Dokument genererat",
        generatedDesc: "Ditt policydokument har skapats",
      },
      errors: {
        loadControl: "Kunde inte ladda kontrollinformation",
        validation: "Valideringsfel",
        titleRequired: "Ange en dokumenttitel",
        generateFailed: "Generering misslyckades",
        generateFailedDesc: "Kunde inte generera dokumentet. Försök igen.",
      },
    },
    // NIS2
    nis2: {
      title: "NIS2-efterlevnad",
      risks: "Risker",
      subtitle: "Spåra och hantera cybersäkerhetsrisker",
      addRisk: "Lägg till risk",
      createTitle: "Skapa ny risk",
      createDesc: "Dokumentera en ny NIS2‑risk för cybersäkerhet",
      form: {
        titleLabel: "Risktitel *",
        descriptionLabel: "Beskrivning",
        riskLevelLabel: "Risknivå",
        statusLabel: "Status",
        mitigationPlanLabel: "Åtgärdsplan",
        titlePlaceholder: "Obehörig åtkomst till kritiska system",
        descriptionPlaceholder: "Detaljerad beskrivning av risken...",
        mitigationPlanPlaceholder: "Steg för att åtgärda denna risk...",
      },
      riskLevels: {
        low: "Låg",
        medium: "Medel",
        high: "Hög",
        critical: "Kritisk",
      },
      statuses: {
        open: "Öppen",
        in_progress: "Pågår",
        mitigated: "Åtgärdad",
        closed: "Stängd",
      },
      actions: {
        create: "Skapa risk",
        cancel: "Avbryt",
        createFirst: "Skapa första risk",
      },
      empty: {
        title: "Inga risker dokumenterade",
        desc: "Börja hantera dina cybersäkerhetsrisker genom att skapa din första riskpost",
        cta: "Skapa första risk",
      },
      sections: {
        mitigationPlan: "Åtgärdsplan:",
      },
    },
    // AI Act
    aiact: {
      title: "AI Act-systemregister",
      systems: "AI-system",
      emptyTitle: "Inga AI-system registrerade",
      emptyDesc: "Börja dokumentera dina AI-system för EU:s AI-lag",
      register: "Registrera system",
      registerFirst: "Registrera första systemet",
    },
    // Controls
    controls: {
      title: "Kontroller",
      subtitle: "Hantera dina compliance-kontroller",
      filters: {
        title: "Filter",
        allFrameworks: "Alla ramverk",
      },
      actions: {
        createPolicy: "Skapa policy",
        runAll: "Kör alla kontroller",
      },
      labels: {
        objective: "Syfte",
        evidenceTypes: "Bevistyper",
        severity: "Allvarlighetsgrad",
      },
      empty: {
        noRules: "Inga kontroller definierade ännu",
        noControls: "Inga kontroller hittades",
      },
      catalog: {
        AI_ACT: {
          AI_01: {
            title: 'Datastyrning',
            objective: 'Säkerställ datakvalitet och datastyrning för AI-system enligt AI-förordningen.'
          },
          AI_02: {
            title: 'Teknisk dokumentation',
            objective: 'Upprätthåll omfattande teknisk dokumentation för AI-system.'
          },
          AI_03: {
            title: 'Riskhantering',
            objective: 'Implementera och underhåll riskhanteringssystem för högrisksystem.'
          }
        },
        GDPR: {
          GDPR_01: {
            title: 'Rättslig grund',
            objective: 'Säkerställ giltig rättslig grund för all personuppgiftsbehandling.'
          },
          GDPR_02: {
            title: 'Informationsskyldighet',
            objective: 'Tillhandahåll tydlig och transparent information till registrerade.'
          },
          GDPR_03: {
            title: 'Registrerades rättigheter',
            objective: 'Säkerställ de registrerades rättigheter enligt GDPR art. 15–22.'
          }
        },
        NIS2: {
          NIS2_01: {
            title: 'Nätverkssäkerhet',
            objective: 'Implementera åtgärder för att säkra nätverks- och informationssystem.'
          },
          NIS2_02: {
            title: 'Incidenthantering',
            objective: 'Etablera processer för hantering och rapportering av säkerhetsincidenter.'
          }
        }
      }
    },
    // Checks
    checks: {
      title: "Kontroller",
      subtitle: "Kör automatiska efterlevnadskontroller och granska resultat.",
      tabs: {
        rules: "Regler",
        results: "Resultat",
      },
      actions: {
        newRule: "Ny regel",
        runAll: "Kör alla",
        runSelected: "Kör valda",
      },
      empty: {
        noRules: "Inga regler konfigurerade ännu",
        noResults: "Inga resultat tillgängliga",
      },
      kind: {
        static: "Statisk",
        query: "Fråga",
        http: "HTTP",
        script: "Skript",
      },
      outcome: {
        pass: "Godkänd",
        fail: "Underkänd",
        warn: "Varning",
      },
      status: {
        pending: "Väntande",
        running: "Körs",
        success: "Lyckad",
        failed: "Misslyckad",
        partial: "Delvis",
      },
      success: {
        checks_run: "Kontroller startade",
        exported: "Resultat exporterade",
        exported_desc: "Fil nedladdad",
      },
      errors: {
        load_failed: "Kunde inte ladda data",
        run_failed: "Kunde inte köra kontroller",
        export_failed: "Export misslyckades",
        noResultsToExport: "Inga resultat att exportera",
      },
      form: {
        new_rule_title: "Skapa ny kontrollregel",
        edit_rule_title: "Redigera regel",
        delete_confirm_title: "Ta bort regel?",
        delete_confirm_text: "Är du säker på att du vill ta bort regel {{code}}?",
        hint: {
          sandbox: "Sandlådeläge: SQL-frågor är skrivskyddade. Skrivåtkomst blockerad.",
        },
        success: {
          updated: "Regel uppdaterad",
          deleted: "Regel borttagen",
          saved: "Regel sparad",
        },
        errors: {
          update_failed: "Uppdatering misslyckades",
          delete_failed: "Borttagning misslyckades",
          duplicate_code: "Regelkod finns redan",
          invalid_spec: "Ogiltig specifikation",
          invalid_json: "Spec är inte giltig JSON",
          save_failed: "Kunde inte spara regel",
          unique_code: "Denna kod används redan",
          invalid_code: "Endast A-Z, 0-9, -, _ (3-40 tecken)",
          query_required: "Fråga krävs",
          control_required: "Välj en kontroll",
        },
        fields: {
          title: "Titel",
          code: "Kod",
          help_code: "Endast A-Z, 0-9, -, _ (t.ex. NIS2-BACKUP-AGE)",
          severity: "Allvarlighetsgrad",
          kind: "Typ",
          enabled: "Aktiverad",
          description: "Beskrivning",
          control_id: "Associerad kontroll",
          spec: "Specifikation",
          source: "Källa",
          query: "Fråga",
          evaluator: "Utvärderare",
          threshold: "Tröskelvärde",
          timeout_ms: "Timeout (ms)",
          metric_key: "Metrisk nyckel",
          aggregation: "Aggregering",
          pass_when: "Godkänd när",
          pass_value: "Jämförelsevärde",
          owner_user_id: "Ägare",
          tags: "Taggar",
          schedule_cron: "Schema (CRON)",
          remediation: "Åtgärdsnotering",
        },
        placeholders: {
          severity: "Välj allvarlighetsgrad",
          kind: "Välj typ",
          control_id: "Välj kontroll...",
        },
        kinds: {
          static: "Statisk",
          query: "Fråga",
        },
        severities: {
          low: "Låg",
          medium: "Medel",
          high: "Hög",
          critical: "Kritisk",
        },
        evaluators: {
          any_pass: "Minst en träff",
          all_pass: "Alla måste passera",
          threshold: "Tröskelvärde",
        },
        aggregations: {
          latest: "Senaste",
          avg: "Medelvärde",
          min: "Minimum",
          max: "Maximum",
          sum: "Summa",
        },
        pass_ops: {
          lte: "≤",
          lt: "<",
          gte: "≥",
          gt: ">",
          eq: "=",
          ne: "≠",
        },
        actions: {
          load_static_template: "Ladda statisk mall",
          load_query_template: "Ladda frågemall",
          cancel: "Avbryt",
          save: "Spara",
          test: "Testkörning",
        },
      },
      filters: {
        title: "Filter",
        reset: "Återställ",
        dateRange: "Datumintervall",
        from: "Från",
        to: "Till",
        search: "Sök",
        searchPlaceholder: "Sök regler...",
        control: "Kontroll",
        allControls: "Alla kontroller",
        severity: "Allvarlighetsgrad",
        outcome: "Resultat",
        status: "Status",
      },
      results: {
        time: "Tid",
        rule: "Regel",
        outcome: "Resultat",
        runStatus: "Status",
        severity: "Allvarlighetsgrad",
        message: "Meddelande",
        actions: "Åtgärder",
        viewDetails: "Visa detaljer",
        copyViewLink: "Kopiera länk",
        copyViewLink_desc: "Länk kopierad",
        showing: "Visar {{from}}-{{to}} av {{total}}",
      },
      drilldown: {
        title: "Kördetaljer",
        noData: "Ingen data tillgänglig",
        runId: "Kör-ID",
        windowStart: "Fönsterstart",
        windowEnd: "Fönsterslut",
        control: "Kontroll",
        details: "Detaljer",
        rerun: "Kör igen",
      },
      labels: {
        code: "Kod",
        title: "Titel",
        kind: "Typ",
        severity: "Allvarlighetsgrad",
        enabled: "Aktiv",
        schedule: "Schema",
        control: "Kontroll",
        outcome: "Resultat",
        message: "Meddelande",
        time: "Tid",
        status: "Status",
      },
      specEditor: {
        form: "Formulär",
        json: "JSON",
        metric: "Mätvärde",
        metricPlaceholder: "t.ex. cpu_usage",
        value: "Värde",
        operator: "Operator",
        threshold: "Tröskelvärde",
        table: "Tabell",
      },
    },
    // Navigation
    nav: {
      dashboard: "Instrumentpanel",
      risks: "NIS2-risker",
      ai: "AI-system",
      ai_systems: "AI-system",
      controls: "Kontroller",
      scope: "Omfattning",
      evidence: "Bevis",
      checks: "Kontroller (auto)",
      audits: "Audit",
      docs: "Dokument",
      documents: "Dokument",
      reports: "Rapporter",
      organization: "Organisation",
      integrations: "Integrationer",
      helpbot_manager: "Helpbot-hanterare",
      certificates: "Intyg",
      admin: "Admin",
      help: "Hjälp",
      logout: "Logga ut",
    },
    // Evidence
    evidence: {
      title: "Bevis",
      subtitle: "Hantera förfrågningar och bevis för kontroller (NIS2, AI-lagen, GDPR).",
      tabs: {
        requests: "Förfrågningar",
        evidence: "Bevis",
      },
      actions: {
        newRequest: "Skapa förfrågan",
        save: "Spara",
        cancel: "Avbryt",
        upload: "Ladda upp",
        review: "Granska",
      },
      fields: {
        control: "Kontroll",
        controlPlaceholder: "Välj en kontroll …",
        title: "Titel",
        description: "Beskrivning",
        dueAt: "Förfaller",
        severity: "Prioritet",
        attach: "Bifoga fil (valfritt)",
        file: "Fil",
        verdict: "Beslut",
        note: "Anteckning",
      },
      severity: {
        low: "Låg",
        medium: "Mellan",
        high: "Hög",
        critical: "Kritisk",
      },
      status: {
        open: "Öppen",
        fulfilled: "Uppfylld",
        expired: "Utgången",
        cancelled: "Avbruten",
      },
      verdict: {
        pending: "Väntar",
        pass: "Godkänd",
        fail: "Avvisad",
        warn: "Varning",
      },
      empty: {
        noRequests: "Inga öppna förfrågningar",
        noEvidence: "Inga bevis ännu",
      },
      table: {
        colControl: "Kontroll",
        colTitle: "Titel",
        colStatus: "Status",
        colDue: "Förfaller",
        colSeverity: "Prioritet",
      },
      success: {
        request_created: "Förfrågan skapad",
        uploaded: "Bevis uppladdat",
        review_saved: "Granskning sparad",
      },
      errors: {
        create_failed: "Det gick inte att skapa förfrågan",
        upload_failed: "Det gick inte att ladda upp bevis",
        review_failed: "Det gick inte att spara granskning",
      },
      validation: {
        controlRequired: "Välj en kontroll.",
        titleRequired: "Titel krävs.",
      },
      types: {
        policy: 'Policy',
        documentation: 'Dokumentation',
        report: 'Rapport',
        log: 'Logg',
        contract: 'Avtal',
        certificate: 'Certifikat',
        audit: 'Revision',
        assessment: 'Bedömning'
      }
    },
    // Jurisdictions
    jurisdictions: {
      selectLabel: "Välj rättslig ram",
      hint: "Välj gällande jurisdiktion – vyer och kontroller anpassas därefter.",
      suffix: " (GDPR + nationell lag)",
    },
    // Training
    training: {
      title: "Utbildningar & intyg",
      description: "Slutför utbildningar och hantera intyg över alla ramverk.",
      hintBar: {
        text: "Kurserna finns för närvarande endast på tyska.",
        cta: "Öppna den tyska kurssidan"
      },
      notice: {
        deOnly: "Dessa kurser finns just nu endast på tyska."
      },
      courses: {
        nis2: {
          title: "NIS2 Grund",
          url: "https://myablefy.com/s/norrland-innovate/nis2-compliance-zertifizierung-6c5e3c3b",
          bullets: [
            "Risk, styrning & rapportering",
            "Incidenthantering & kontinuitet",
            "Praktiska uppgifter för småföretag"
          ]
        },
        lead: {
          title: "EU AI-akten – Ledning",
          url: "https://myablefy.com/s/norrland-innovate/zertifizierter-online-kurs-eu-ki-gesetz-compliance-fuer-unternehmen-5b90e795",
          bullets: [
            "Skyldigheter & riskklasser",
            "Policies & ansvar",
            "Tillsyn av leverantörer & system"
          ]
        },
        emp: {
          title: "EU AI-akten – Medarbetare",
          url: "https://myablefy.com/s/norrland-innovate/eu-ai-act-mitarbeiter-schulung-866722a6",
          bullets: [
            "Säker & ansvarsfull AI-användning",
            "Dataskydd & prompts",
            "Gör & gör inte på jobbet"
          ]
        }
      },
      actions: {
        upload: "Ladda upp intyg",
        verifyByCode: "Verifiera med kod"
      },
      sections: {
        uploaded: {
          title: "Uppladdade intyg",
          subtitle: "Granska och verifiera inskickade utbildningsintyg",
          empty: "Inga intyg ännu"
        }
      }
    },
    // AI Systems
    aiSystems: {
      register: {
        title: "Registrera AI-system",
        description: "Dokumentera ett nytt AI-system för EU AI Act-efterlevnad.",
        fields: {
          system_name: "Systemnamn",
          custom_name: "Eget namn (valfritt)",
          custom_name_ph: "Ange ett eget systemnamn",
          description: "Beskrivning",
          purpose: "Syfte",
          risk: "Riskklassificering",
          deployment: "Driftsättningsstatus"
        },
        presets: {
          label: "Snabbmallar",
          custom: "Annat / Eget",
          hintText: "Välj en vanlig AI-systemtyp för att förifyll fält eller välj \"Eget\"."
        },
        actions: { 
          submit: "Registrera system",
          cancel: "Avbryt"
        },
        success: "AI-system registrerat"
      },
      risk: { 
        minimal: "Minimal risk", 
        limited: "Begränsad risk", 
        high: "Hög risk" 
      },
      deploy: { 
        planned: "Planerad", 
        testing: "Testning", 
        live: "Live", 
        retired: "Avvecklad" 
      }
    },
    // Common
    common: {
      save: "Spara",
      cancel: "Avbryt",
      delete: "Ta bort",
      edit: "Redigera",
      loading: "Laddar...",
      saving: "Sparar...",
      error: "Fel",
      success: "Framgång",
      required: "Obligatorisk",
      optional: "Valfritt",
      confirm: "Bekräfta",
      language: "Språk",
      fullName: "Fullständigt namn",
      orContinueWith: "Eller fortsätt med",
      disabled: "Inaktiverad",
      previous: "Föregående",
      next: "Nästa",
      viewCourse: "Visa kurs",
      tooltips: {
        adminOnly: "Endast för administratörer",
        noRules: "Inga regler tillgängliga",
      },
      severity: {
        low: "Låg",
        medium: "Medel",
        high: "Hög",
        critical: "Kritisk",
      },
      forbidden: "Åtkomst nekad",
    },
    // Errors
    errors: {
      generic: "Ett fel uppstod. Försök igen.",
    },
    // Validation
    validation: {
      required: "Vänligen fyll i alla obligatoriska fält",
      codesMismatch: "Koderna stämmer inte överens",
      masterCodeMismatch: "Huvudkoderna stämmer inte överens",
      deleteCodeMismatch: "Raderingskoderna stämmer inte överens",
      codeLength: "Koder måste vara minst 8 tecken långa",
      emailInvalid: "Ogiltig e-postadress",
    },
  },
};

export type Language = keyof typeof translations;
export type TranslationKeys = typeof translations.en;
