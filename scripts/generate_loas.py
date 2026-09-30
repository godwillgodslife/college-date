import os
import subprocess

TELCOS = [
    {
        "key": "Airtel",
        "name": "Airtel Networks Limited",
        "address": "Plot L2, Banana Island, Ikoyi, Lagos, Nigeria",
        "attn": "The Head of Regulatory & Carrier Services",
        "filename": "Letter_of_Authorisation_Airtel_CollegeDate.pdf"
    },
    {
        "key": "MTN",
        "name": "MTN Nigeria Communications Plc",
        "address": "Corporate Headquarters, Golden Plaza, Falomo, Ikoyi, Lagos, Nigeria",
        "attn": "The Team Lead, Carrier Relations & Interconnect",
        "filename": "Letter_of_Authorisation_MTN_CollegeDate.pdf"
    },
    {
        "key": "9mobile",
        "name": "Emerging Markets Telecommunication Services Ltd (9mobile)",
        "address": "Plot 19, Zone L, Banana Island, Ikoyi, Lagos, Nigeria",
        "attn": "The Head, Wholesale & Carrier Relations",
        "filename": "Letter_of_Authorisation_9mobile_CollegeDate.pdf"
    },
    {
        "key": "GLO",
        "name": "Globacom Limited",
        "address": "Mike Adenuga Towers, 1 Mike Adenuga Close, Victoria Island, Lagos, Nigeria",
        "attn": "The Head of Corporate & Carrier Services",
        "filename": "Letter_of_Authorisation_GLO_CollegeDate.pdf"
    }
]

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
    @page {{
        size: A4;
        margin: 20mm 18mm 20mm 18mm;
    }}
    body {{
        font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
        color: #1a1a2e;
        margin: 0;
        padding: 0;
        font-size: 13.5px;
        line-height: 1.55;
    }}
    .letterhead {{
        border-bottom: 2.5px solid #1a1a2e;
        padding-bottom: 12px;
        margin-bottom: 22px;
    }}
    .company-title {{
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #0d1b2a;
        text-transform: uppercase;
        margin: 0 0 4px 0;
    }}
    .sub-brand {{
        font-size: 13px;
        font-weight: 600;
        color: #e63946;
        margin-bottom: 6px;
    }}
    .letterhead-details {{
        font-size: 11px;
        color: #555;
        line-height: 1.4;
    }}
    .date-block {{
        font-weight: 600;
        margin-bottom: 18px;
    }}
    .recipient-block {{
        margin-bottom: 20px;
        line-height: 1.45;
    }}
    .recipient-block .attn {{
        font-weight: bold;
    }}
    .through-block {{
        margin: 12px 0 20px 0;
        font-style: italic;
        background-color: #f4f6f8;
        padding: 6px 12px;
        border-left: 3px solid #1a1a2e;
        font-size: 12.5px;
    }}
    .subject-line {{
        font-weight: 800;
        font-size: 14.5px;
        text-transform: uppercase;
        border-bottom: 1.5px solid #333;
        padding-bottom: 4px;
        margin: 20px 0 16px 0;
    }}
    p {{
        margin: 0 0 12px 0;
        text-align: justify;
    }}
    .details-table {{
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0 18px 0;
    }}
    .details-table td {{
        padding: 6px 10px;
        border: 1px solid #dcdde1;
        font-size: 12.5px;
    }}
    .details-table td.label {{
        width: 32%;
        font-weight: bold;
        background-color: #f8f9fa;
        color: #2c3e50;
    }}
    .undertaking-box {{
        background: #fafafa;
        border: 1px solid #e1e8ed;
        border-radius: 4px;
        padding: 10px 14px;
        margin: 14px 0;
        font-size: 12px;
        line-height: 1.45;
    }}
    .undertaking-box ol {{
        margin: 4px 0 4px 20px;
        padding: 0;
    }}
    .undertaking-box li {{
        margin-bottom: 4px;
    }}
    .signature-section {{
        margin-top: 30px;
        page-break-inside: avoid;
    }}
    .signature-space {{
        height: 48px;
    }}
    .signatory-name {{
        font-weight: bold;
        font-size: 13.5px;
        margin-bottom: 2px;
    }}
    .signatory-title {{
        color: #555;
        font-size: 12px;
    }}
    .stamp-box {{
        display: inline-block;
        border: 1.5px dashed #aaa;
        padding: 6px 16px;
        color: #888;
        font-size: 11px;
        margin-top: 10px;
        border-radius: 4px;
    }}
</style>
</head>
<body>

<div class="letterhead">
    <div class="company-title">NEWAY MARKETING ENTERPRISES</div>
    <div class="sub-brand">Parent & Operating Entity of "The College Date"</div>
    <div class="letterhead-details">
        Registered under the Companies and Allied Matters Act, Federal Republic of Nigeria<br>
        Web: https://www.thecollegedate.com &bull; Email: info@thecollegedate.com &bull; Tel: +234 (0) 800 000 0000<br>
        Corporate Operating Office: Lagos, Nigeria
    </div>
</div>

<div class="date-block">
    Date: 21st September 2026
</div>

<div class="recipient-block">
    To:<br>
    <span class="attn">{attn}</span><br>
    <strong>{telco_name}</strong><br>
    {telco_address}
</div>

<div class="through-block">
    <strong>Through:</strong> Termii Networks Limited (Authorized SMS Aggregator & Gateway Partner)
</div>

<div class="subject-line">
    LETTER OF AUTHORISATION TO REGISTER AND ROUTE SENDER ID: "CollegeDate"
</div>

<p>
    We, <strong>Neway Marketing Enterprises</strong>, the legal owners and operators of the university social discovery and campus networking platform <strong>The College Date</strong> (https://www.thecollegedate.com), hereby authorize <strong>Termii Networks Limited</strong> to register, whitelist, and transmit SMS traffic on our behalf using the designated Alphanumeric Sender ID:
</p>

<table class="details-table">
    <tr>
        <td class="label">Requested Sender ID</td>
        <td><strong>CollegeDate</strong> (11 Characters)</td>
    </tr>
    <tr>
        <td class="label">Brand / Platform</td>
        <td><strong>The College Date</strong> (Operating under Neway Marketing Enterprises)</td>
    </tr>
    <tr>
        <td class="label">Website / Portal</td>
        <td>https://www.thecollegedate.com</td>
    </tr>
    <tr>
        <td class="label">Message Category</td>
        <td><strong>Strictly Transactional</strong> (User Authentication, OTPs, Match & Connection Alerts)</td>
    </tr>
    <tr>
        <td class="label">Target Audience</td>
        <td>Registered, verified university students in Nigeria</td>
    </tr>
    <tr>
        <td class="label">Aggregator / Gateway</td>
        <td>Termii Networks Limited</td>
    </tr>
</table>

<p>
    <strong>Sample Transactional Messages:</strong><br>
    1. <em>"Your College Date verification code is 482910. Valid for 10 minutes. Do not share this code with anyone."</em><br>
    2. <em>"You have a new connection request on The College Date! Open the app to view your admirer: https://www.thecollegedate.com/requests"</em>
</p>

<div class="undertaking-box">
    <strong>UNDERTAKING & REGULATORY INDEMNITY:</strong>
    <ol>
        <li>Neway Marketing Enterprises confirms full ownership and proprietary interest in the platform 'The College Date' and the requested Sender ID 'CollegeDate'.</li>
        <li>We affirm that all phone numbers receiving messages via this Sender ID belong to users who have explicitly opted in via user registration on our web and mobile apps.</li>
        <li>We warrant that all transmissions will strictly comply with the guidelines and directives of the Nigerian Communications Commission (NCC), including anti-spam and Do-Not-Disturb (DND) regulations.</li>
        <li>Neway Marketing Enterprises hereby indemnifies {telco_name} and Termii Networks Limited against any regulatory penalties, claims, liabilities, or losses arising from the legitimate use of this Sender ID.</li>
    </ol>
</div>

<p>
    We kindly request that you expedite the approval and activation of the Sender ID <strong>"CollegeDate"</strong> on your network.
</p>

<div class="signature-section">
    Yours faithfully,<br>
    <strong>For: NEWAY MARKETING ENTERPRISES</strong><br>
    <div class="signature-space"></div>
    <div class="signatory-name">Authorized Signatory / Managing Director</div>
    <div class="signatory-title">Neway Marketing Enterprises &bull; The College Date</div>
    <div class="stamp-box">Official Stamp / Signature</div>
</div>

</body>
</html>
"""

def generate_pdfs():
    out_dir = os.path.abspath("compliance_documents")
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    browser = chrome_path if os.path.exists(chrome_path) else edge_path

    print(f"Using browser: {browser}")

    for telco in TELCOS:
        html_content = HTML_TEMPLATE.format(
            telco_name=telco["name"],
            telco_address=telco["address"],
            attn=telco["attn"]
        )
        html_file = os.path.join(out_dir, f"loa_{telco['key'].lower()}.html")
        pdf_file = os.path.join(out_dir, telco["filename"])

        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        cmd = [
            browser,
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_file}",
            html_file
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if os.path.exists(pdf_file) and os.path.getsize(pdf_file) > 0:
            print(f"[OK] Generated: {telco['filename']} ({os.path.getsize(pdf_file)} bytes)")
        else:
            print(f"[FAIL] Failed: {telco['filename']}. Error: {res.stderr}")

if __name__ == "__main__":
    generate_pdfs()
