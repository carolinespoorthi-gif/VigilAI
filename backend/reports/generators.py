"""
reports/generators.py — PDF and DOCX report generation.

Contains:
  • generate_pdf_simple / generate_docx_simple  — legacy (renamed originals)
  • generate_pdf / generate_docx               — proxy to legacy for backward compat
  • generate_compliance_report_pdf              — NEW 10-section industry-grade report
"""
import io, re, textwrap
from datetime import datetime, timezone
from typing import Dict, Any, List


# ═══════════════════════════════════════════════════════════════════════════
#  LEGACY PDF (renamed, kept for backward compatibility)
# ═══════════════════════════════════════════════════════════════════════════

def generate_pdf_simple(filename, risk_score, compliance_score, risk_level,
                        compliance_status, detailed_findings, violated_regulations,
                        remediation_plan) -> bytes:
    return _legacy_pdf(filename, risk_score, compliance_score, risk_level,
                       compliance_status, detailed_findings, violated_regulations,
                       remediation_plan)

# Backward-compat alias
generate_pdf = generate_pdf_simple


def _legacy_pdf(filename, risk_score, compliance_score, risk_level,
                compliance_status, detailed_findings, violated_regulations,
                remediation_plan) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                    Table, TableStyle, HRFlowable)
    from reportlab.lib.enums import TA_CENTER

    DARK = colors.HexColor('#1e293b')
    ACCENT = colors.HexColor('#6366f1')
    CRIT = colors.HexColor('#991b1b')
    HIGH = colors.HexColor('#dc2626')
    MED  = colors.HexColor('#d97706')
    LOW  = colors.HexColor('#16a34a')
    RISK_CLR = {'CRITICAL':CRIT,'HIGH':HIGH,'MEDIUM':MED,'LOW':LOW}

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    def h2(text):
        return Paragraph(text, ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=12,
                                              textColor=DARK, spaceBefore=8, spaceAfter=4))
    def body(text, color=None):
        return Paragraph(text, ParagraphStyle('body', fontName='Helvetica', fontSize=9,
                                              textColor=color or DARK, spaceAfter=2, leftIndent=8))

    hdr = Table([[Paragraph('AI Compliance Guardian',
                            ParagraphStyle('h',fontName='Helvetica-Bold',fontSize=20,
                                           textColor=colors.white,alignment=TA_CENTER))]],
                colWidths=[17*cm])
    hdr.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),DARK),
                              ('TOPPADDING',(0,0),(-1,-1),14),('BOTTOMPADDING',(0,0),(-1,-1),14)]))
    story.append(hdr); story.append(Spacer(1,0.3*cm))
    story.append(Paragraph(f'PII Compliance Report — {filename}',
                            ParagraphStyle('t2',fontName='Helvetica-Bold',fontSize=14,textColor=DARK,spaceAfter=2)))
    story.append(Paragraph(f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}',
                            ParagraphStyle('meta',fontName='Helvetica',fontSize=9,
                                           textColor=colors.HexColor('#64748b'),spaceAfter=8)))
    story.append(HRFlowable(width='100%',thickness=1,color=ACCENT)); story.append(Spacer(1,0.4*cm))

    rclr = RISK_CLR.get(risk_level, MED)
    sd = [[Paragraph(v,ParagraphStyle('sv',fontName='Helvetica-Bold',fontSize=15,
                                      textColor=rclr,alignment=TA_CENTER)),
           Paragraph(v2,ParagraphStyle('sv',fontName='Helvetica-Bold',fontSize=15,
                                       textColor=LOW,alignment=TA_CENTER)),
           Paragraph(risk_level,ParagraphStyle('sv',fontName='Helvetica-Bold',fontSize=13,
                                               textColor=rclr,alignment=TA_CENTER)),
           Paragraph(compliance_status.replace('_',' '),
                     ParagraphStyle('sv',fontName='Helvetica-Bold',fontSize=10,
                                    textColor=rclr,alignment=TA_CENTER))]
          for v,v2 in [(f'{risk_score}/100',f'{compliance_score}/100')]]
    st = Table(sd, colWidths=[4.25*cm]*4)
    st.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0,colors.white)]))
    story.append(st); story.append(Spacer(1,0.5*cm))

    if violated_regulations:
        story.append(h2('Violated Regulations'))
        for reg in violated_regulations:
            story.append(body(f'• {reg}', CRIT))
        story.append(Spacer(1,0.4*cm))

    story.append(h2('Detected PII Instances'))
    if detailed_findings:
        rows = [['Type','Value','Severity','Category']]
        for f in detailed_findings:
            rows.append([f.get('type',''), str(f.get('value',''))[:80],
                         f.get('severity',''), f.get('category','')])
        tbl = Table(rows, colWidths=[3.5*cm,8*cm,2.5*cm,3*cm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),DARK),('TEXTCOLOR',(0,0),(-1,0),colors.white),
            ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),
            ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f1f5f9'),colors.HexColor('#e2e8f0')]),
            ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#cbd5e1')),
            ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
            ('LEFTPADDING',(0,0),(-1,-1),4),
        ]))
        story.append(tbl)
    else:
        story.append(body('No PII instances detected.', LOW))
    story.append(Spacer(1,0.5*cm))

    story.append(h2('Remediation Plan'))
    clr_map = [('immediate_actions','Immediate Actions',CRIT),
               ('short_term_actions','Short-term Actions',HIGH),
               ('long_term_actions','Long-term Actions',ACCENT),
               ('technical_controls','Technical Controls',colors.HexColor('#0284c7')),
               ('compliance_notes','Compliance Notes',colors.HexColor('#7c3aed'))]
    for key, label, clr in clr_map:
        items = remediation_plan.get(key, [])
        if not items: continue
        story.append(Paragraph(label, ParagraphStyle('sub',fontName='Helvetica-Bold',fontSize=10,
                                                      textColor=clr,spaceBefore=6,spaceAfter=2)))
        for item in items:
            story.append(body(f'• {item}'))

    doc.build(story)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════════
#  LEGACY DOCX
# ═══════════════════════════════════════════════════════════════════════════

def generate_docx_simple(filename, risk_score, compliance_score, risk_level,
                         compliance_status, detailed_findings, violated_regulations,
                         remediation_plan) -> bytes:
    return _legacy_docx(filename, risk_score, compliance_score, risk_level,
                        compliance_status, detailed_findings, violated_regulations,
                        remediation_plan)

generate_docx = generate_docx_simple


def _legacy_docx(filename, risk_score, compliance_score, risk_level,
                 compliance_status, detailed_findings, violated_regulations,
                 remediation_plan) -> bytes:
    from docx import Document
    from docx.shared import Pt, RGBColor, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    DARK  = RGBColor(0x1e,0x29,0x3b)
    CRIT  = RGBColor(0x99,0x1b,0x1b)
    HIGH  = RGBColor(0xdc,0x26,0x26)
    MED   = RGBColor(0xd9,0x77,0x06)
    LOW   = RGBColor(0x16,0xa3,0x4a)
    ACC   = RGBColor(0x63,0x66,0xf1)
    WHITE = RGBColor(0xff,0xff,0xff)
    RISK_CLR={'CRITICAL':CRIT,'HIGH':HIGH,'MEDIUM':MED,'LOW':LOW}
    SEV_CLR ={'Critical':CRIT,'High':HIGH,'Medium':MED,'Low':LOW}

    doc = Document()
    for s in doc.sections:
        s.left_margin=s.right_margin=Cm(2.5)
        s.top_margin=s.bottom_margin=Cm(2)

    def _run(p, text, bold=False, size=11, color=None):
        r = p.add_run(text); r.bold=bold; r.font.size=Pt(size)
        if color: r.font.color.rgb=color

    def _shd(cell, hex_color):
        tc=cell._tc; pr=tc.get_or_add_tcPr()
        shd=OxmlElement('w:shd')
        shd.set(qn('w:val'),'clear'); shd.set(qn('w:color'),'auto')
        shd.set(qn('w:fill'),hex_color); pr.append(shd)

    h=doc.add_heading('AI Compliance Guardian',0); h.alignment=WD_ALIGN_PARAGRAPH.CENTER
    if h.runs: h.runs[0].font.color.rgb=DARK

    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    _run(p,f'PII Compliance Report — {filename}',bold=True,size=13,color=ACC)
    p2=doc.add_paragraph(); p2.alignment=WD_ALIGN_PARAGRAPH.CENTER
    _run(p2,f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}',size=9,color=RGBColor(0x64,0x74,0x8b))
    doc.add_paragraph()

    rclr=RISK_CLR.get(risk_level,MED)
    t=doc.add_table(rows=2,cols=4); t.style='Table Grid'
    for i,(h_,v_) in enumerate([('Risk Score',f'{risk_score}/100'),
                                  ('Compliance',f'{compliance_score}/100'),
                                  ('Risk Level',risk_level),
                                  ('Status',compliance_status.replace('_',' '))]):
        hc=t.cell(0,i); vc=t.cell(1,i)
        hc.text=''; _shd(hc,'1e293b')
        _run(hc.paragraphs[0],h_,bold=True,size=9,color=WHITE)
        vc.text=''; _run(vc.paragraphs[0],v_,bold=True,size=12,color=rclr if i>=2 else DARK)
    doc.add_paragraph()

    if violated_regulations:
        h2=doc.add_heading('Violated Regulations',level=2)
        if h2.runs: h2.runs[0].font.color.rgb=DARK
        for reg in violated_regulations:
            p=doc.add_paragraph(style='List Bullet')
            _run(p,reg,bold=True,color=CRIT)
        doc.add_paragraph()

    h2=doc.add_heading('Detected PII Instances',level=2)
    if h2.runs: h2.runs[0].font.color.rgb=DARK
    if detailed_findings:
        tbl=doc.add_table(rows=1,cols=4); tbl.style='Table Grid'
        for i,lbl in enumerate(['Type','Value','Severity','Category']):
            c=tbl.rows[0].cells[i]; _shd(c,'1e293b')
            _run(c.paragraphs[0],lbl,bold=True,size=9,color=WHITE)
        for f in detailed_findings:
            row=tbl.add_row().cells
            sclr=SEV_CLR.get(f.get('severity','Low'),LOW)
            row[0].text=''; _run(row[0].paragraphs[0],f.get('type',''),size=9)
            row[1].text=''; _run(row[1].paragraphs[0],str(f.get('value',''))[:80],size=9)
            row[2].text=''; _run(row[2].paragraphs[0],f.get('severity',''),bold=True,size=9,color=sclr)
            row[3].text=''; _run(row[3].paragraphs[0],f.get('category',''),size=9)
    else:
        p=doc.add_paragraph(); _run(p,'No PII instances detected.',color=LOW)
    doc.add_paragraph()

    h2=doc.add_heading('Remediation Plan',level=2)
    if h2.runs: h2.runs[0].font.color.rgb=DARK
    clr_map=[('immediate_actions','Immediate Actions',CRIT),
             ('short_term_actions','Short-term Actions',HIGH),
             ('long_term_actions','Long-term Actions',ACC),
             ('technical_controls','Technical Controls',RGBColor(0x02,0x84,0xc7)),
             ('compliance_notes','Compliance Notes',RGBColor(0x7c,0x3a,0xed))]
    for key,label,clr in clr_map:
        items=remediation_plan.get(key,[])
        if not items: continue
        h3=doc.add_heading(label,level=3)
        if h3.runs: h3.runs[0].font.color.rgb=clr
        for item in items:
            p=doc.add_paragraph(style='List Bullet'); p.add_run(item).font.size=Pt(10)

    buf=io.BytesIO(); doc.save(buf); return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════════════
#  NEW: 10-SECTION INDUSTRY-GRADE COMPLIANCE REPORT
#  Matches the TIA-style report layout from the reference images.
# ═══════════════════════════════════════════════════════════════════════════

def generate_compliance_report_pdf(scan: Dict[str, Any]) -> bytes:
    """
    Produce a multi-page, enterprise-quality PDF report with 10 sections.

    `scan` must be a full scan record dict from the _SCAN_STORE, enriched
    with the new fields: entity_details, data_categories, compliance_result,
    key_findings, context_flags.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm, mm
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                    Table, TableStyle, HRFlowable,
                                    PageBreak, KeepTogether)
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

    # ── Brand colours (dark teal palette matching reference) ──────────────
    HEADER_BG   = colors.HexColor('#0a3d62')
    SECTION_BG  = colors.HexColor('#0a3d62')
    WHITE       = colors.white
    DARK        = colors.HexColor('#1e293b')
    LIGHT_BG    = colors.HexColor('#f8fafc')
    BORDER      = colors.HexColor('#cbd5e1')
    ACCENT      = colors.HexColor('#2980b9')

    CLR_HIGH    = colors.HexColor('#dc2626')
    CLR_MED     = colors.HexColor('#d97706')
    CLR_LOW     = colors.HexColor('#16a34a')
    CLR_CRIT    = colors.HexColor('#991b1b')

    RISK_CLR = {'HIGH': CLR_HIGH, 'MEDIUM': CLR_MED, 'LOW': CLR_LOW, 'CRITICAL': CLR_CRIT}

    # ── Extract scan data ─────────────────────────────────────────────────
    filename       = scan.get('filename', 'Unknown')
    risk_score     = scan.get('risk_score', 0)
    risk_level     = scan.get('risk_level', 'LOW')
    comp_result    = scan.get('compliance_result', {})
    comp_score     = comp_result.get('score', scan.get('compliance_score', 100))
    comp_status    = comp_result.get('status', scan.get('compliance_status', 'COMPLIANT'))
    deductions     = comp_result.get('deductions', [])
    data_cats      = scan.get('data_categories', {})
    entity_details = scan.get('entity_details', [])
    key_findings   = scan.get('key_findings', [])
    context_flags  = scan.get('context_flags', [])
    data_issues    = scan.get('data_issues', [])
    root_causes    = scan.get('root_causes', [])
    before_after   = scan.get('before_after', [])
    violated_regs  = scan.get('violated_regulations', [])
    rem_plan       = scan.get('remediation_plan', {})
    total_entities = scan.get('risk_items', 0)
    scanned_at     = scan.get('scanned_at', datetime.now(timezone.utc).isoformat())

    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')

    # Risk distribution counts
    high_c = sum(1 for e in entity_details if e.get('risk_level') == 'HIGH')
    med_c  = sum(1 for e in entity_details if e.get('risk_level') == 'MEDIUM')
    low_c  = sum(1 for e in entity_details if e.get('risk_level') == 'LOW')
    total_e = max(high_c + med_c + low_c, 1)

    # ── Styles ────────────────────────────────────────────────────────────
    def s_section_header():
        return ParagraphStyle('sh', fontName='Helvetica-Bold', fontSize=13,
                              textColor=WHITE, spaceBefore=0, spaceAfter=0,
                              leftIndent=6, leading=20)

    def s_body(size=9.5, bold=False, color=None, indent=0):
        return ParagraphStyle('b', fontName='Helvetica-Bold' if bold else 'Helvetica',
                              fontSize=size, textColor=color or DARK,
                              spaceAfter=3, spaceBefore=1, leftIndent=indent,
                              leading=size * 1.5)

    def s_center(size=9.5, bold=False, color=None):
        return ParagraphStyle('c', fontName='Helvetica-Bold' if bold else 'Helvetica',
                              fontSize=size, textColor=color or DARK,
                              alignment=TA_CENTER)

    # ── Section header banner ─────────────────────────────────────────────
    def section_header(story, number, title):
        t = Table(
            [[Paragraph(f'{number}. {title}', s_section_header())]],
            colWidths=[17 * cm]
        )
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), SECTION_BG),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(Spacer(1, 0.5 * cm))
        story.append(t)
        story.append(Spacer(1, 0.3 * cm))

    # ── Mask sensitive values ─────────────────────────────────────────────
    def mask(val: str, entity_type: str) -> str:
        val = str(val)
        t = entity_type.upper()
        if any(k in t for k in ('SSN', 'AADHAAR', 'CREDIT', 'PASSWORD', 'API KEY')):
            if len(val) > 4:
                return '*' * (len(val) - 4) + val[-4:]
        if 'EMAIL' in t and '@' in val:
            local, domain = val.split('@', 1)
            return local[0] + '***@' + domain
        return val

    # ── Build document ────────────────────────────────────────────────────
    buf = io.BytesIO()

    page_num = [0]

    def on_page(canvas, doc):
        page_num[0] += 1
        w, h = A4

        # ── Top header bar ────────────────────────────────────────────────
        canvas.saveState()
        canvas.setFillColor(HEADER_BG)
        canvas.rect(0, h - 2.2 * cm, w, 2.2 * cm, fill=1, stroke=0)

        # Left: brand
        canvas.setFillColor(WHITE)
        canvas.setFont('Helvetica-Bold', 16)
        canvas.drawString(1.5 * cm, h - 1.1 * cm, 'VIGIL AI')
        canvas.setFont('Helvetica', 8)
        canvas.drawString(1.5 * cm, h - 1.6 * cm, 'AI Compliance Guardian')

        # Right: report info box
        canvas.setFillColor(colors.HexColor('#2980b9'))
        canvas.rect(w - 7 * cm, h - 2.0 * cm, 6 * cm, 1.6 * cm, fill=1, stroke=0)
        canvas.setFillColor(WHITE)
        canvas.setFont('Helvetica-Bold', 10)
        canvas.drawString(w - 6.5 * cm, h - 0.8 * cm, 'Compliance Report')
        canvas.setFont('Helvetica', 7.5)
        canvas.drawString(w - 6.5 * cm, h - 1.2 * cm, f'Date: {ts}')
        canvas.setFont('Helvetica', 7)
        src_display = filename[:35] + '...' if len(filename) > 35 else filename
        canvas.drawString(w - 6.5 * cm, h - 1.55 * cm, f'Source: {src_display}')

        # ── Footer ────────────────────────────────────────────────────────
        canvas.setFillColor(colors.HexColor('#0a3d62'))
        canvas.rect(0, 0, w, 0.8 * cm, fill=1, stroke=0)
        canvas.setFillColor(WHITE)
        canvas.setFont('Helvetica-Oblique', 7)
        canvas.drawString(1 * cm, 0.25 * cm,
                          f'CONFIDENTIAL  |  Vigil AI  |  Generated {ts}  |  Page {page_num[0]}')
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.5 * cm, rightMargin=1.5 * cm,
        topMargin=3 * cm, bottomMargin=1.5 * cm,
    )
    story: List = []

    # ══════════════════════════════════════════════════════════════════════
    # 1. EXECUTIVE SUMMARY
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 1, 'EXECUTIVE SUMMARY')

    summary_text = (
        f'This report presents the results of an automated compliance analysis conducted on '
        f'the feed: <b>{filename}</b>. A total of <b>{total_entities}</b> unique data entities were '
        f'identified and scored. The overall risk posture is assessed as <b>{risk_level}</b>. '
        f'Of all entities, {high_c} ({_pct(high_c, total_e)}) are classified as High risk, '
        f'{med_c} ({_pct(med_c, total_e)}) as Medium, and '
        f'{low_c} ({_pct(low_c, total_e)}) as Low. '
        f'The compliance score is <b>{comp_score}/100</b> ({comp_status.replace("_", " ")}).'
    )
    story.append(Paragraph(summary_text, s_body(9.5)))

    # ══════════════════════════════════════════════════════════════════════
    # 2. DATA OVERVIEW
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 2, 'DATA OVERVIEW')

    # Metric boxes
    personal = data_cats.get('Personal', 0)
    financial = data_cats.get('Financial', 0)
    sensitive = data_cats.get('Sensitive', 0)

    box_data = [
        [_metric_box(str(total_entities), 'Total Entities', colors.HexColor('#0a3d62')),
         _metric_box(str(high_c), f'High Risk\n{_pct(high_c, total_e)}', CLR_HIGH),
         _metric_box(str(med_c), f'Medium Risk\n{_pct(med_c, total_e)}', CLR_MED),
         _metric_box(str(low_c), f'Low Risk\n{_pct(low_c, total_e)}', CLR_LOW)]
    ]
    bt = Table(box_data, colWidths=[4.25 * cm] * 4)
    bt.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(bt)
    story.append(Spacer(1, 0.3 * cm))

    # Category breakdown
    cat_rows = [
        [Paragraph('<b>Category</b>', s_body(9, True, WHITE)),
         Paragraph('<b>Count</b>', s_body(9, True, WHITE)),
         Paragraph('<b>Percentage</b>', s_body(9, True, WHITE))],
        ['Personal', str(personal), _pct(personal, total_entities or 1)],
        ['Financial', str(financial), _pct(financial, total_entities or 1)],
        ['Sensitive', str(sensitive), _pct(sensitive, total_entities or 1)],
    ]
    ct = Table(cat_rows, colWidths=[6 * cm, 5.5 * cm, 5.5 * cm])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECTION_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_BG, WHITE]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(ct)

    # ══════════════════════════════════════════════════════════════════════
    # 3. RISK DISTRIBUTION
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 3, 'RISK DISTRIBUTION')

    story.append(Paragraph('<b>Risk Distribution</b>', s_body(10, True)))
    # Horizontal bar
    bar_data = [[
        _bar_segment(f'High {_pct(high_c, total_e)}', CLR_HIGH,
                     max(high_c / total_e * 17, 0.5)),
        _bar_segment(f'Med {_pct(med_c, total_e)}', CLR_MED,
                     max(med_c / total_e * 17, 0.5)),
        _bar_segment(f'Low {_pct(low_c, total_e)}', CLR_LOW,
                     max(low_c / total_e * 17, 0.5)),
    ]]
    h_pct = max(high_c / total_e, 0.03) * 17
    m_pct = max(med_c / total_e, 0.03) * 17
    l_pct = max(low_c / total_e, 0.03) * 17
    bar_t = Table(bar_data, colWidths=[h_pct * cm, m_pct * cm, l_pct * cm])
    bar_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), CLR_HIGH),
        ('BACKGROUND', (1, 0), (1, 0), CLR_MED),
        ('BACKGROUND', (2, 0), (2, 0), CLR_LOW),
        ('TEXTCOLOR', (0, 0), (-1, -1), WHITE),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(bar_t)

    # ══════════════════════════════════════════════════════════════════════
    # 4. DETECTED ENTITIES TABLE
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 4, 'DETECTED ENTITIES TABLE')

    if entity_details:
        hdr_row = [
            Paragraph('<b>Entity Type</b>', s_body(8, True, WHITE)),
            Paragraph('<b>Value (Masked)</b>', s_body(8, True, WHITE)),
            Paragraph('<b>Risk Level</b>', s_body(8, True, WHITE)),
            Paragraph('<b>Risk Score</b>', s_body(8, True, WHITE)),
            Paragraph('<b>Source</b>', s_body(8, True, WHITE)),
        ]
        rows = [hdr_row]
        for e in entity_details[:50]:  # cap at 50 rows for readability
            rl = e.get('risk_level', 'LOW')
            rclr = RISK_CLR.get(rl, CLR_LOW)
            rows.append([
                e.get('type', ''),
                Paragraph(mask(e.get('value', ''), e.get('type', '')), s_body(8)),
                Paragraph(f'<b>{rl}</b>', s_body(8, True, rclr)),
                str(e.get('risk_score', 0)),
                filename[:25],
            ])

        et = Table(rows, colWidths=[3 * cm, 6.5 * cm, 2.5 * cm, 2 * cm, 3 * cm])
        et.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), SECTION_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_BG, WHITE]),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(et)
    else:
        story.append(Paragraph('No entities detected.', s_body(9.5, color=CLR_LOW)))

    # ══════════════════════════════════════════════════════════════════════
    # 5. DATA ISSUES IDENTIFIED
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 5, 'DATA ISSUES IDENTIFIED')
    if data_issues:
        for issue in data_issues:
            story.append(Paragraph(f'<b>•</b> {issue}', s_body(9.5, indent=6)))
    else:
        story.append(Paragraph('No critical data issues identified.', s_body(9.5)))

    # ══════════════════════════════════════════════════════════════════════
    # 6. ROOT CAUSE ANALYSIS
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 6, 'ROOT CAUSE ANALYSIS')
    if root_causes:
        for cause in root_causes:
            story.append(Paragraph(f'<b>•</b> {cause}', s_body(9.5, indent=6)))
    else:
        story.append(Paragraph('No major compliance gaps found.', s_body(9.5)))

    # ══════════════════════════════════════════════════════════════════════
    # 7. KEY FINDINGS & ANALYSIS
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 7, 'KEY FINDINGS & ANALYSIS')
    if key_findings:
        for kf in key_findings:
            story.append(Paragraph(f'<b>•</b> {kf}', s_body(9.5, indent=6)))
    else:
        story.append(Paragraph('No significant findings.', s_body(9.5)))

    # ══════════════════════════════════════════════════════════════════════
    # 8. NAAC CRITERION 4 COMPLIANCE ANALYSIS
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 8, 'NAAC CRITERION 4 COMPLIANCE ANALYSIS')

    naac_entities = [e for e in entity_details if e.get('type') == 'NAAC_C4_ENTITY']
    if naac_entities:
        story.append(Paragraph('<b>Detected NAAC Entities:</b>', s_body(9.5, True)))
        naac_rows = [
            [Paragraph('<b>Keyword</b>', s_body(8, True, WHITE)),
             Paragraph('<b>Sub-Criterion</b>', s_body(8, True, WHITE)),
             Paragraph('<b>Violations / Suggestions</b>', s_body(8, True, WHITE))]
        ]
        
        for e in naac_entities:
            val = e.get('value', '')
            sub = e.get('naac_sub_criterion', '4')
            fix = "Review infrastructure standard for compliance"
            v_lower = val.lower()
            if any(k in v_lower for k in ['cybersecurity', 'firewall']): fix = "Implement strong IT security and tracking logs"
            elif 'maintenance' in v_lower: fix = "Establish clear SOPs and regular maintenance audits"
            
            naac_rows.append([val, sub, Paragraph(fix, s_body(8))])
            
        nt = Table(naac_rows, colWidths=[5 * cm, 3 * cm, 9 * cm])
        nt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), SECTION_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_BG, WHITE]),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(nt)
    else:
        story.append(Paragraph('No NAAC Criterion 4 related entities detected.', s_body(9.5)))

    # ══════════════════════════════════════════════════════════════════════
    # 9. COMPLIANCE ANALYSIS
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 9, 'COMPLIANCE ANALYSIS')

    story.append(Paragraph(
        f'Compliance Score: <b>{comp_score}/100</b> — Status: <b>{comp_status.replace("_", " ")}</b>',
        s_body(10, True)))
    story.append(Spacer(1, 0.2 * cm))

    if deductions:
        ded_rows = [
            [Paragraph('<b>Violation</b>', s_body(8, True, WHITE)),
             Paragraph('<b>Severity</b>', s_body(8, True, WHITE)),
             Paragraph('<b>Instances</b>', s_body(8, True, WHITE)),
             Paragraph('<b>Deduction</b>', s_body(8, True, WHITE))],
        ]
        for d in deductions:
            sev = d.get('severity', 'Minor')
            sclr = CLR_HIGH if sev == 'Severe' else CLR_MED if sev == 'Moderate' else CLR_LOW
            ded_rows.append([
                d.get('type', ''),
                Paragraph(f'<b>{sev}</b>', s_body(8, True, sclr)),
                str(d.get('count', 0)),
                f"-{d.get('deduction', 0)}",
            ])
        dt = Table(ded_rows, colWidths=[5 * cm, 4 * cm, 4 * cm, 4 * cm])
        dt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), SECTION_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_BG, WHITE]),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(dt)

    if violated_regs:
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph('<b>Violated Regulations:</b>', s_body(9.5, True)))
        for reg in violated_regs:
            story.append(Paragraph(f'  • {reg}', s_body(9, indent=10)))

    # ══════════════════════════════════════════════════════════════════════
    # 10. RISK SUMMARY
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 10, 'RISK SUMMARY')

    rclr = RISK_CLR.get(risk_level, CLR_MED)
    story.append(Paragraph(
        f'Overall Risk Posture: <b><font color="{rclr.hexval()}">{risk_level}</font></b> '
        f'(Score: {risk_score}/100)',
        s_body(11, True)))
    story.append(Spacer(1, 0.2 * cm))

    if risk_level == 'HIGH':
        story.append(Paragraph(
            'Immediate containment actions are required. Restrict access to all '
            'affected data stores and escalate to the security operations team without delay.',
            s_body(9.5)))
    elif risk_level == 'MEDIUM':
        story.append(Paragraph(
            'Moderate risk detected. Prioritise data masking and access controls. '
            'Schedule a review within 48 hours to prevent escalation.',
            s_body(9.5)))
    else:
        story.append(Paragraph(
            'Low risk posture. Continue standard monitoring. Implement recommended '
            'best practices to maintain compliance.',
            s_body(9.5)))

    # ══════════════════════════════════════════════════════════════════════
    # 11. MITIGATION MEASURES
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 11, 'MITIGATION MEASURES')
    story.append(Paragraph('<b>Automated Fixes Available:</b>', s_body(9.5, True)))
    story.append(Paragraph('• Mask sensitive values (SSNs, API keys)', s_body(9, indent=6)))
    story.append(Paragraph('• Flag risky combinations through DLP hooks', s_body(9, indent=6)))
    story.append(Paragraph('• Remediate plain-text password exposures', s_body(9, indent=6)))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph('<b>Manual Measures Required:</b>', s_body(9.5, True)))
    story.append(Paragraph('• Apply AES-256 encryption on unencrypted storage', s_body(9, indent=6)))
    story.append(Paragraph('• Enforce Role-Based Access Control (RBAC) rules', s_body(9, indent=6)))
    story.append(Paragraph('• Setup Audit logging for all data processing', s_body(9, indent=6)))

    # ══════════════════════════════════════════════════════════════════════
    # 12. BEFORE VS AFTER FIX
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 12, 'BEFORE VS AFTER FIX')
    if before_after:
        ba_hdr = [
            Paragraph('<b>Entity Type</b>', s_body(8, True, WHITE)),
            Paragraph('<b>Original View (Before)</b>', s_body(8, True, WHITE)),
            Paragraph('<b>Masked View (After)</b>', s_body(8, True, WHITE))
        ]
        ba_rows = [ba_hdr]
        for item in before_after:
            ba_rows.append([
                item.get('type', ''),
                item.get('before', ''),
                item.get('after', '')
            ])
        bat = Table(ba_rows, colWidths=[4.5 * cm, 6 * cm, 6 * cm])
        bat.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), SECTION_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_BG, WHITE]),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(bat)
    else:
        story.append(Paragraph('No masking applied.', s_body(9.5)))

    # ══════════════════════════════════════════════════════════════════════
    # 13. RECOMMENDED ACTIONS
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 13, 'RECOMMENDED ACTIONS')

    action_badges = [
        ('MASK SENSITIVE DATA', CLR_HIGH,
         'Apply data masking to all exposed PII fields — SSNs, credit cards, Aadhaar.'),
        ('ENCRYPT STORAGE', CLR_MED,
         'Implement AES-256 encryption at rest for all data stores containing PII.'),
        ('RESTRICT ACCESS', colors.HexColor('#2980b9'),
         'Apply role-based access controls (RBAC) — least privilege principle.'),
    ]

    for key, label in [('immediate_actions', 'BLOCK IMMEDIATELY'),
                       ('short_term_actions', 'MONITOR & REVIEW')]:
        items = rem_plan.get(key, [])
        for item in items[:2]:
            action_badges.append((label, CLR_HIGH if 'BLOCK' in label else CLR_MED, item))

    for badge_label, badge_clr, desc in action_badges:
        badge_row = Table(
            [[Paragraph(f'<b>{badge_label}</b>',
                        ParagraphStyle('badge', fontName='Helvetica-Bold', fontSize=8,
                                       textColor=WHITE, alignment=TA_CENTER)),
              Paragraph(desc, s_body(9))]],
            colWidths=[4 * cm, 13 * cm]
        )
        badge_row.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), badge_clr),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(badge_row)
        story.append(Spacer(1, 0.15 * cm))

    # ══════════════════════════════════════════════════════════════════════
    # 14. CONCLUSION
    # ══════════════════════════════════════════════════════════════════════
    section_header(story, 14, 'CONCLUSION')

    urgency = 'URGENT' if risk_level == 'HIGH' else 'MODERATE' if risk_level == 'MEDIUM' else 'LOW'
    story.append(Paragraph(
        f'Overall Risk Posture: <b><font color="{rclr.hexval()}">{risk_level}</font></b>',
        s_body(11, True)))
    story.append(Spacer(1, 0.2 * cm))

    if risk_level == 'HIGH':
        story.append(Paragraph(
            'Immediate containment actions are required. Block all High-risk indicators '
            'and escalate to the security operations team without delay.',
            s_body(9.5)))
    elif risk_level == 'MEDIUM':
        story.append(Paragraph(
            'Moderate risk environment. Schedule remediation within the next sprint cycle. '
            'Monitor for any escalation patterns.',
            s_body(9.5)))
    else:
        story.append(Paragraph(
            'Risk posture is within acceptable thresholds. Continue periodic scanning '
            'and maintain current data protection controls.',
            s_body(9.5)))

    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        f'Urgency Level: <b>{urgency}</b>', s_body(10, True)))

    # ══════════════════════════════════════════════════════════════════════
    # 15. FOOTER NOTE
    # ══════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph(
        '<i>This report is auto-generated by the Vigil AI Compliance Guardian. '
        'For queries, contact your compliance team.</i>',
        ParagraphStyle('fn', fontName='Helvetica-Oblique', fontSize=8,
                       textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER)))

    # ── Build ─────────────────────────────────────────────────────────────
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()


# ── Utility funcs ─────────────────────────────────────────────────────────

def _pct(n: int, total: int) -> str:
    if total <= 0:
        return '0.0%'
    return f'{n / total * 100:.1f}%'


def _metric_box(value: str, label: str, color):
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib import colors as _c
    from reportlab.platypus import Table, TableStyle, Paragraph

    val_p = Paragraph(
        f'<b>{value}</b>',
        ParagraphStyle('mv', fontName='Helvetica-Bold', fontSize=18,
                       textColor=color, alignment=TA_CENTER))
    lbl_p = Paragraph(
        label.replace('\n', '<br/>'),
        ParagraphStyle('ml', fontName='Helvetica', fontSize=8,
                       textColor=_c.HexColor('#64748b'), alignment=TA_CENTER))
    t = Table([[val_p], [lbl_p]], colWidths=[3.8 * 28.35])  # ~3.8 cm
    t.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, color),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t


def _bar_segment(text: str, color, width_cm: float):
    from reportlab.platypus import Paragraph
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib import colors as _c
    return Paragraph(
        f'<b>{text}</b>',
        ParagraphStyle('bs', fontName='Helvetica-Bold', fontSize=7.5,
                       textColor=_c.white, alignment=TA_CENTER))
