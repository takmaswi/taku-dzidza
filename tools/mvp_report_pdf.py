"""Builds docs/MVP-Report.pdf, Takunda's report on the MVP hardening work.

Run from the repo root: python tools/mvp_report_pdf.py <tests> <e2e> <commit>
Copy rule: no hyphens, en dashes or em dashes outside code and URLs. Text inside
c(...) is code and is exempt. The script refuses to build if any slip in.
"""
import re
import sys
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "MVP-Report.pdf"
TESTS, E2E, COMMIT = sys.argv[1], sys.argv[2], sys.argv[3]

CREAM, BUTTER, HONEY, INK, SOFT, MSASA, SAGE, LINE = (HexColor(h) for h in ("#FFF8EC", "#F8E2A8", "#F2B33D", "#111111", "#5C5346", "#B4452F", "#4F6B54", "#E4D9C4"))

# Arial is the stand in for this PDF: it ships with Windows and needs no download.
FONTS = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Body", FONTS / "arial.ttf"))
pdfmetrics.registerFont(TTFont("Bold", FONTS / "arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Code", FONTS / "consola.ttf"))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Bold", italic="Body", boldItalic="Bold")

H1 = ParagraphStyle("h1", fontName="Bold", fontSize=23, leading=28, textColor=INK, spaceAfter=4)
H2 = ParagraphStyle("h2", fontName="Bold", fontSize=13.5, leading=18, textColor=INK, spaceBefore=13, spaceAfter=5)
P = ParagraphStyle("p", fontName="Body", fontSize=9.8, leading=14, textColor=INK, spaceAfter=5)
LEAD = ParagraphStyle("lead", parent=P, fontSize=11, leading=15.5)
SMALL = ParagraphStyle("s", parent=P, fontSize=8.2, leading=11.4, textColor=SOFT)
CELL = ParagraphStyle("c", parent=P, fontSize=8.6, leading=11.6, spaceAfter=0)
CELLB = ParagraphStyle("cb", parent=CELL, fontName="Bold")
BULLET = ParagraphStyle("b", parent=P, leftIndent=11, bulletIndent=0, spaceAfter=3)
CODE = ParagraphStyle("code", fontName="Code", fontSize=8.6, leading=12, textColor=INK, backColor=BUTTER, borderPadding=(5, 6, 5, 6), spaceBefore=4, spaceAfter=9, leftIndent=6, rightIndent=6)

ALL_TEXT: list[str] = []


def c(code: str) -> str:
    return f'<font face="Code" size="8.4">{code}</font>'


def t(text: str) -> str:
    ALL_TEXT.append(text)
    return text


def para(text: str, style=P) -> Paragraph:
    return Paragraph(t(text), style)


def bullets(items: list[str]) -> list[Paragraph]:
    return [Paragraph(t(i), BULLET, bulletText="\u2022") for i in items]


def table(rows: list[list[str]], widths: list[float]) -> Table:
    data = [[Paragraph(t(x), CELLB if r == 0 else CELL) for x in row] for r, row in enumerate(rows)]
    tb = Table(data, colWidths=[w * mm for w in widths], repeatRows=1)
    tb.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BUTTER),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return tb


s = []
s.append(para("MVP hardening report", H1))
s.append(para("Takudzidza by Taku. 5 November 2026. For Takunda.", SMALL))
s.append(Spacer(1, 6))
s.append(para(
    f"<b>All 18 items are built and pushed to main as commit {c(COMMIT)}. Nothing is deployed.</b> "
    "Production is still running the old version, and its settings were not touched. "
    f"Every check passed on the final code in mock AI mode: lint, typecheck, {TESTS} unit and backend tests, the build, and {E2E} browser journeys on a phone size and a desktop size.",
    LEAD,
))
s.append(para(
    "<b>Mock mode is the limit of this proof.</b> No real AI model, email, text message, Google sign in or Sentry was called. "
    "So the features are proven to work with recorded replies and stand in senders, and how they behave with the real services is still unknown.",
    LEAD,
))

s.append(para("Before you deploy", H2))
s.append(para(
    "<b>New learners under 18 cannot finish guardian consent until a text message provider is added.</b> "
    "You asked for consent to complete only with a phone code, and for the real provider to stay unconfigured. Together those mean the guardian's page says permission by text message is not switched on yet, and the learner stays waiting. "
    "Learners whose consent is already given are not affected. So you either add a provider first, or accept that the app is adults only for now."
))
s.append(para(
    f"<b>The daily caps are very tight.</b> The learner cap defaults to USD 0.05 a day, a number I assumed and did not measure. The deployment cap stays at USD 0.50 a day for everyone together. Set both before learners arrive. Production's old {c('LEARNER_DAILY_AI_CALLS')} setting is ignored once this version is deployed."
))

s.append(para("What you need to add", H2))
s.append(table([
    ["Item", "Until you add it", "What to do"],
    [f"<b>Text message provider</b> for guardian codes. Blocks under 18s.", "New under 18s cannot finish consent.", f"Choose a provider that reaches Zimbabwe. A developer then implements {c('SmsSender')} in {c('convex/accounts/sms.ts')}. It needs code as well as a key."],
    [f"<b>Resend</b>: {c('RESEND_API_KEY')}, {c('EMAIL_FROM')}", "Sign up works with no email check, and nobody can reset a password. Forgot password is hidden.", f"Create a Resend account, verify a sending domain, and set both on Convex. Without a verified domain, the default sender only reaches the Resend account's owner."],
    [f"<b>Google sign in</b>: {c('AUTH_GOOGLE_ID')}, {c('AUTH_GOOGLE_SECRET')}", "The Google button stays hidden.", f"Create an OAuth client in Google Cloud. Redirect address: {c('&lt;CONVEX_SITE_URL&gt;/api/auth/callback/google')}. Set both on Convex."],
    [f"<b>Sentry</b>: {c('VITE_SENTRY_DSN')}", "No error tracking.", "Create a Sentry project and set this on Vercel, then rebuild. It is read at build time."],
    [f"<b>Caps</b>: {c('LEARNER_DAILY_USD_CAP')}, {c('AI_DAILY_USD_CAP')}", "USD 0.05 per learner and USD 0.50 in total per day.", "Set both on Convex. Measure real cost per tool first if you can."],
    ["<b>Lawyer</b>", "The privacy notice and terms show \"Draft for legal review\" on the page.", "Have both read. They describe what the app does and claim compliance with no law."],
    [f"<b>Live red team</b>", "Only the mock run has been done.", f"Run {c('pnpm redteam --cap 0.10')} on the local backend with your OpenRouter key, before under 18s use the app."],
    [f"<b>Social image</b>: {c('/art/og-default.webp')}", "Link previews have no picture.", "It comes from Codex's art batch. Some link preview crawlers may not read WebP; this could not be tested without a deploy."],
], [50, 50, 70]))
s.append(para(f"Exact settings are in {c('docs/DEPLOY.md')}. The Vercel protection noted there on 29 October also has to be off before learners can reach the site.", SMALL))

s.append(para("What changed", H2))
s.append(table([
    ["", "Item", "What it does now"],
    ["1", "Link reader", "Follows at most 3 redirects, checks each one, and blocks private addresses at the moment of connecting."],
    ["2", "Email codes", "Email verification and password reset by code, sent through Resend. Admin access needs a verified email."],
    ["3", "Google sign in", "Built, and hidden until its keys exist."],
    ["4", "Guardian consent", "Needs a 6 digit code sent to the guardian's phone. The link stays. Limits on sends and tries."],
    ["5", "Spending caps", "USD per learner per day replaces call counts, plus the deployment cap. Cost recorded per tool, alert rows at 50 and 80 percent, friendly limit messages, several model ids per tier."],
    ["6", "Second opinion", "A fast model checks Taku's ideas and marking schemes. Rejected items are dropped. If the check fails to run, items are marked not checked."],
    ["7", "Maths", "KaTeX and chemistry in answers, cards, papers and print. Prompts now ask for LaTeX between $ signs."],
    ["8", "Widgets", "Taku supplies data, the app draws it and its own code marks each step. Equation steps, fill in the blanks from notes, long division. In Guide me answers and the Study tools tab."],
    ["9", "Chat composer", "No longer covers the intro or starter chips at 360 by 640."],
    ["10", "Sign out", "Moved to Settings. Screens that cannot reach Settings keep their own button."],
    ["11", "Progress", "Chat replies arrive as they are written. Notebook answers show Reading your notes, Writing your answer, Checking quotes."],
    ["12", "Notebook on phones", "Ask Taku first. Sources and settings sit in a sheet behind a Sources button."],
    ["13", "First run checklist", "Add notes, Ask one question, Make flashcards, on home, read from what the learner has done."],
    ["14", "Style picker", "A compact version in Settings."],
    ["15", "Landing", "Open Graph and Twitter tags, and the copy is in the page's HTML for crawlers. The build fails if it goes missing."],
    ["16", "Sentry and counts", "Sentry is off when unset and strips personal data. Feature counts stay in our own database, off by default, and are never used for under 18s."],
    ["17", "Privacy and terms", "Public draft pages, based only on what the code does."],
    ["18", "Red team", "A script for answer leaks, companion requests and unsafe topics. Mock in CI, live only with a spending cap."],
], [7, 36, 127]))
s.append(para(f"I also added a CI workflow ({c('.github/workflows/ci.yml')}): lint, typecheck, tests, mock red team and build on every push. Its first run, on this commit, passed. Browser journeys do not run in CI, because they need a local backend. Printing a paper also used to include the sidebar and tab bar; that is fixed.", SMALL))

s.append(KeepTogether([
    para("What a security review found", H2),
    para("I ran a read only security review on the auth, consent, link and cap code before committing. It found these. The first four changed the code, and tests cover those changes:"),
    *bullets([
        "<b>High, narrowed but not closed:</b> many calls at once could all pass the cap, because cost is only known after the model answers. A learner can now start 12 things a minute, or 20 for reading photos. They can still pass the cap by what one minute of starts costs, and many learners together can pass the deployment cap by a little.",
        "<b>Medium, fixed:</b> a guardian who gave, withdrew and gave again could not withdraw a second time.",
        "<b>Medium, fixed:</b> a hostile web page could burn server time in the HTML reader.",
        "<b>Low, fixed:</b> a bad character code on a page could leave a link source stuck on reading.",
        "<b>Open, your decision:</b> the phone code proves someone holds a phone, and proves nothing about who they are. The learner holds the link, so a learner could type their own number and consent for themselves. Decide how to handle this before adding the real provider.",
    ]),
]))

s.append(para("What has not been tested", H2))
s.extend(bullets([
    "<b>Any real model.</b> Widget prompts, second opinion quality and LaTeX in real answers have only run against replies I wrote by hand. The mock red team shows the app routes those replies correctly and says nothing about what a real model would do.",
    "<b>Real senders and sign in.</b> The Resend sending code, the Google flow and Sentry have never reached the real services.",
    "<b>Real cost.</b> Costs in mock mode are modelled. The USD 0.05 cap has no measurement behind it.",
    "<b>Anything in production,</b> including link previews and the first deploy of the new schema.",
    "<b>Held answers.</b> Guide me relies on the prompt not to give the answer away. No filter on the output was added; that is still Phase 5.",
]))
s.append(para(f"The audit findings were not pasted into the brief, so I read the audit PDF from the other worktree for context and built the numbered list as the scope. Findings outside that list were not worked on. Decisions and sources are in {c('DECISIONS.md')}. The commit has no co author line, because you asked for no model identifiers in commits.", P))

s.append(KeepTogether([
    para("How to roll back", H2),
    para(f"The tag {c('checkpoint-before-mvp')} marks commit {c('bb8677b')}, the state before this work. History was not rewritten, so the safe way back is a revert commit:"),
    Paragraph(f"git revert {COMMIT}<br/>git push origin main", CODE),
    para("To only look at the old code:"),
    Paragraph("git switch --detach checkpoint-before-mvp", CODE),
    para("Production needs no rollback today, because this version has not been deployed. If it is deployed and later reverted, Convex may refuse the old schema, because stored rows would hold fields the old schema does not list. In that case keep the new schema and revert only the rest."),
]))

# The copy rule: code spans are exempt, everything else may not hold a hyphen or a dash.
plain = re.sub(r'<font face="Code"[^>]*>.*?</font>', " ", "\n".join(ALL_TEXT))
plain = re.sub(r"<[^>]+>", " ", plain)
bad = re.findall(r"\S*[-\u2010-\u2015]\S*", plain)
if bad:
    raise SystemExit(f"Copy rule: hyphens or dashes in {bad}")


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    canvas.restoreState()


def page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Body", 8)
    canvas.setFillColor(SOFT)
    canvas.drawRightString(A4[0] - 20 * mm, 11 * mm, f"Page {doc.page}")
    canvas.restoreState()


class Doc(SimpleDocTemplate):
    def handle_pageBegin(self):
        super().handle_pageBegin()
        footer(self.canv, self)


Doc(str(OUT), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm, title="Takudzidza MVP hardening report", author="Takudzidza build").build(s, onFirstPage=page_number, onLaterPages=page_number)
print(f"wrote {OUT}")
