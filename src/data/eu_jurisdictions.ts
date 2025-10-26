import type { Jurisdiction } from "@/types/jurisdiction";

export const EU_JURISDICTIONS: Jurisdiction[] = [
  // AT
  { iso2:"AT", iso3:"AUT", name_en:"Austria", name_de:"Österreich", name_sv:"Österrike",
    dpa_name:"Österreichische Datenschutzbehörde", dpa_abbrev:"DSB",
    dpa_url:"https://www.dsb.gv.at/", national_law:"Datenschutzgesetz (DSG)" },
  // BE
  { iso2:"BE", iso3:"BEL", name_en:"Belgium", name_de:"Belgien", name_sv:"Belgien",
    dpa_name:"Gegevensbeschermingsautoriteit / Autorité de protection des données", dpa_abbrev:"GBA/APD",
    dpa_url:"https://www.dataprotectionauthority.be/", national_law:"Gesetz vom 30.07.2018 (GDPR-Umsetzung)" },
  // BG
  { iso2:"BG", iso3:"BGR", name_en:"Bulgaria", name_de:"Bulgarien", name_sv:"Bulgarien",
    dpa_name:"Commission for Personal Data Protection", dpa_abbrev:"CPDP",
    dpa_url:"https://www.cpdp.bg/en/", national_law:"Personal Data Protection Act" },
  // HR
  { iso2:"HR", iso3:"HRV", name_en:"Croatia", name_de:"Kroatien", name_sv:"Kroatien",
    dpa_name:"Croatian Personal Data Protection Agency", dpa_abbrev:"AZOP",
    dpa_url:"https://azop.hr/en/", national_law:"Act on Implementation of the GDPR" },
  // CY
  { iso2:"CY", iso3:"CYP", name_en:"Cyprus", name_de:"Zypern", name_sv:"Cypern",
    dpa_name:"Office of the Commissioner for Personal Data Protection",
    dpa_url:"http://www.dataprotection.gov.cy/", national_law:"Law on Protection of Natural Persons (2018)" },
  // CZ
  { iso2:"CZ", iso3:"CZE", name_en:"Czechia", name_de:"Tschechien", name_sv:"Tjeckien",
    dpa_name:"Office for Personal Data Protection", dpa_abbrev:"ÚOOÚ",
    dpa_url:"https://www.uoou.cz/en/", national_law:"Act on Personal Data Processing" },
  // DK
  { iso2:"DK", iso3:"DNK", name_en:"Denmark", name_de:"Dänemark", name_sv:"Danmark",
    dpa_name:"Datatilsynet", dpa_url:"https://www.datatilsynet.dk/",
    national_law:"Databeskyttelsesloven" },
  // EE
  { iso2:"EE", iso3:"EST", name_en:"Estonia", name_de:"Estland", name_sv:"Estland",
    dpa_name:"Andmekaitse Inspektsioon (Data Protection Inspectorate)", dpa_abbrev:"AKI",
    dpa_url:"https://www.aki.ee/en", national_law:"Personal Data Protection Act" },
  // FI
  { iso2:"FI", iso3:"FIN", name_en:"Finland", name_de:"Finnland", name_sv:"Finland",
    dpa_name:"Office of the Data Protection Ombudsman", dpa_abbrev:"DPO",
    dpa_url:"https://tietosuoja.fi/en/frontpage", national_law:"Tietosuojalaki (Data Protection Act)" },
  // FR
  { iso2:"FR", iso3:"FRA", name_en:"France", name_de:"Frankreich", name_sv:"Frankrike",
    dpa_name:"Commission nationale de l'informatique et des libertés", dpa_abbrev:"CNIL",
    dpa_url:"https://www.cnil.fr/", national_law:"Loi Informatique et Libertés (geändert)" },
  // DE
  { iso2:"DE", iso3:"DEU", name_en:"Germany", name_de:"Deutschland", name_sv:"Tyskland",
    dpa_name:"BfDI & Landesdatenschutzbehörden", dpa_abbrev:"BfDI",
    dpa_url:"https://www.bfdi.bund.de/", national_law:"Bundesdatenschutzgesetz (BDSG)" },
  // GR
  { iso2:"GR", iso3:"GRC", name_en:"Greece", name_de:"Griechenland", name_sv:"Grekland",
    dpa_name:"Hellenic Data Protection Authority", dpa_abbrev:"HDPA",
    dpa_url:"https://www.dpa.gr/", national_law:"Law 4624/2019 (GDPR-Bestimmungen)" },
  // HU
  { iso2:"HU", iso3:"HUN", name_en:"Hungary", name_de:"Ungarn", name_sv:"Ungern",
    dpa_name:"National Authority for Data Protection and Freedom of Information", dpa_abbrev:"NAIH",
    dpa_url:"https://www.naih.hu/", national_law:"Act CXII of 2011 + GDPR-Updates" },
  // IE
  { iso2:"IE", iso3:"IRL", name_en:"Ireland", name_de:"Irland", name_sv:"Irland",
    dpa_name:"Data Protection Commission", dpa_abbrev:"DPC",
    dpa_url:"https://www.dataprotection.ie/", national_law:"Data Protection Act 2018" },
  // IT
  { iso2:"IT", iso3:"ITA", name_en:"Italy", name_de:"Italien", name_sv:"Italien",
    dpa_name:"Garante per la protezione dei dati personali", dpa_abbrev:"Garante",
    dpa_url:"https://www.garanteprivacy.it/", national_law:"Codice in materia di protezione dei dati personali" },
  // LV
  { iso2:"LV", iso3:"LVA", name_en:"Latvia", name_de:"Lettland", name_sv:"Lettland",
    dpa_name:"Data State Inspectorate", dpa_abbrev:"DVI",
    dpa_url:"https://www.dvi.gov.lv/en", national_law:"Personal Data Processing Law" },
  // LT
  { iso2:"LT", iso3:"LTU", name_en:"Lithuania", name_de:"Litauen", name_sv:"Litauen",
    dpa_name:"State Data Protection Inspectorate", dpa_abbrev:"VDAI",
    dpa_url:"https://vdai.lrv.lt/en/", national_law:"Law on Legal Protection of Personal Data" },
  // LU
  { iso2:"LU", iso3:"LUX", name_en:"Luxembourg", name_de:"Luxemburg", name_sv:"Luxemburg",
    dpa_name:"Commission nationale pour la protection des données", dpa_abbrev:"CNPD",
    dpa_url:"https://cnpd.public.lu/", national_law:"Law of 1 August 2018 on Data Protection" },
  // MT
  { iso2:"MT", iso3:"MLT", name_en:"Malta", name_de:"Malta", name_sv:"Malta",
    dpa_name:"Information and Data Protection Commissioner", dpa_abbrev:"IDPC",
    dpa_url:"https://idpc.org.mt/", national_law:"Data Protection Act (Cap. 586)" },
  // NL
  { iso2:"NL", iso3:"NLD", name_en:"Netherlands", name_de:"Niederlande", name_sv:"Nederländerna",
    dpa_name:"Autoriteit Persoonsgegevens", dpa_abbrev:"AP",
    dpa_url:"https://autoriteitpersoonsgegevens.nl/", national_law:"UAVG (GDPR Implementation Act)" },
  // PL
  { iso2:"PL", iso3:"POL", name_en:"Poland", name_de:"Polen", name_sv:"Polen",
    dpa_name:"Personal Data Protection Office", dpa_abbrev:"UODO",
    dpa_url:"https://uodo.gov.pl/", national_law:"Personal Data Protection Act (2018)" },
  // PT
  { iso2:"PT", iso3:"PRT", name_en:"Portugal", name_de:"Portugal", name_sv:"Portugal",
    dpa_name:"Comissão Nacional de Proteção de Dados", dpa_abbrev:"CNPD",
    dpa_url:"https://www.cnpd.pt/", national_law:"Lei de Proteção de Dados (2019)" },
  // RO
  { iso2:"RO", iso3:"ROU", name_en:"Romania", name_de:"Rumänien", name_sv:"Rumänien",
    dpa_name:"National Supervisory Authority for Personal Data Processing", dpa_abbrev:"ANSPDCP",
    dpa_url:"https://www.dataprotection.ro/", national_law:"Law 190/2018 (GDPR Implementation)" },
  // SK
  { iso2:"SK", iso3:"SVK", name_en:"Slovakia", name_de:"Slowakei", name_sv:"Slovakien",
    dpa_name:"Office for Personal Data Protection of the Slovak Republic",
    dpa_abbrev:"ÚOOÚ SR", dpa_url:"https://dataprotection.gov.sk/", national_law:"Act on Personal Data Protection" },
  // SI
  { iso2:"SI", iso3:"SVN", name_en:"Slovenia", name_de:"Slowenien", name_sv:"Slovenien",
    dpa_name:"Information Commissioner", dpa_abbrev:"IP RS",
    dpa_url:"https://www.ip-rs.si/", national_law:"Personal Data Protection Act (ZVOP-2)" },
  // ES
  { iso2:"ES", iso3:"ESP", name_en:"Spain", name_de:"Spanien", name_sv:"Spanien",
    dpa_name:"Agencia Española de Protección de Datos", dpa_abbrev:"AEPD",
    dpa_url:"https://www.aepd.es/", national_law:"Ley Orgánica 3/2018 (LOPDGDD)" },
  // SE
  { iso2:"SE", iso3:"SWE", name_en:"Sweden", name_de:"Schweden", name_sv:"Sverige",
    dpa_name:"Integritetsskyddsmyndigheten", dpa_abbrev:"IMY",
    dpa_url:"https://www.imy.se/", national_law:"Dataskyddslagen (2018:218)" }
];
