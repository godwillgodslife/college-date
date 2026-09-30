import os
import subprocess

HTML_DECLARATION = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
    @page {
        size: A4;
        margin: 20mm 18mm 20mm 18mm;
    }
    body {
        font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
        color: #1a1a2e;
        margin: 0;
        padding: 0;
        font-size: 13.5px;
        line-height: 1.6;
    }
    .letterhead {
        border-bottom: 2.5px solid #1a1a2e;
        padding-bottom: 12px;
        margin-bottom: 22px;
    }
    .company-title {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #0d1b2a;
        text-transform: uppercase;
        margin: 0 0 4px 0;
    }
    .sub-brand {
        font-size: 13px;
        font-weight: 600;
        color: #e63946;
        margin-bottom: 6px;
    }
    .letterhead-details {
        font-size: 11px;
        color: #555;
        line-height: 1.4;
    }
    .date-block {
        font-weight: 600;
        margin-bottom: 18px;
    }
    .subject-line {
        font-weight: 800;
        font-size: 14.5px;
        text-transform: uppercase;
        border-bottom: 1.5px solid #333;
        padding-bottom: 4px;
        margin: 20px 0 16px 0;
    }
    p {
        margin: 0 0 14px 0;
        text-align: justify;
    }
    .highlight-box {
        background: #f8f9fa;
        border-left: 4px solid #0d1b2a;
        padding: 12px 16px;
        margin: 16px 0;
        font-size: 13px;
    }
    .signature-section {
        margin-top: 36px;
        page-break-inside: avoid;
    }
    .signature-space {
        height: 50px;
    }
    .signatory-name {
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 2px;
    }
    .signatory-title {
        color: #555;
        font-size: 12px;
    }
    .stamp-box {
        display: inline-block;
        border: 1.5px dashed #aaa;
        padding: 8px 18px;
        color: #888;
        font-size: 11px;
        margin-top: 12px;
        border-radius: 4px;
    }
</style>
</head>
<body>

<div class="letterhead">
    <div class="company-title">NEWAY MARKETING ENTERPRISES</div>
    <div class="sub-brand">Parent Company & Legal Operating Entity of "The College Date"</div>
    <div class="letterhead-details">
        Duly registered under the Companies and Allied Matters Act, Federal Republic of Nigeria<br>
        Web: https://www.thecollegedate.com &bull; Email: info@thecollegedate.com &bull; Tel: +234 (0) 800 000 0000<br>
        Corporate Registered Address: Lagos, Nigeria
    </div>
</div>

<div class="date-block">
    Date: 21st September 2026
</div>

<div class="subject-line">
    STATUTORY DECLARATION OF BUSINESS OPERATIONS & DIGITAL PLATFORM OWNERSHIP
</div>

<p>
    <strong>TO WHOM IT MAY CONCERN / REGULATORY COMPLIANCE REVIEW TEAM:</strong>
</p>

<p>
    This official document confirms that <strong>NEWAY MARKETING ENTERPRISES</strong> is a legally constituted business enterprise registered with the Corporate Affairs Commission (CAC) of the Federal Republic of Nigeria under the Companies and Allied Matters Act (CAMA 2020).
</p>

<div class="highlight-box">
    <strong>OPERATING PLATFORM DETAILS:</strong><br>
    &bull; <strong>Platform / Brand Name:</strong> The College Date<br>
    &bull; <strong>Official Website:</strong> https://www.thecollegedate.com<br>
    &bull; <strong>Business Nature:</strong> Information Technology, Online Student Networking, Digital Community Services, and Mobile Software Platforms.<br>
    &bull; <strong>Applicable Regulatory Framework:</strong> NDPA (Nigeria Data Protection Act 2023), Federal Competition and Consumer Protection Act (FCCPA), and NCC Consumer Protection Regulations.
</div>

<p>
    <strong>Nature of Business & Operating License Classification:</strong><br>
    The College Date operates strictly as an educational campus social discovery, dating, and community networking mobile and web application for university students in Nigeria. The business does not engage in regulated financial depository activities, banking, betting/lottery, or telecommunications carrier infrastructure; therefore, it does not require specialized statutory licenses such as CBN or NLRC permits.
</p>

<p>
    Our operations are fully licensed and authorized under our primary <strong>Corporate Affairs Commission (CAC) Certificate of Registration</strong> and federal tax compliance authorities in Nigeria.
</p>

<p>
    All SMS communications sent via our registered Sender ID <strong>"CollegeDate"</strong> are purely transactional, consisting of verification PINs, user authentication codes, match notifications, and account security notices delivered strictly to university students who have registered on our platform.
</p>

<div class="signature-section">
    Yours faithfully,<br>
    <strong>For: NEWAY MARKETING ENTERPRISES</strong><br>
    <div class="signature-space"></div>
    <div class="signatory-name">Managing Director / Authorized Officer</div>
    <div class="signatory-title">Neway Marketing Enterprises &bull; The College Date</div>
    <div class="stamp-box">Official Seal & Signature</div>
</div>

</body>
</html>
"""

def generate():
    out_dir = os.path.abspath("compliance_documents")
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    
    html_file = os.path.join(out_dir, "business_declaration.html")
    pdf_file = os.path.join(out_dir, "Business_Operating_Declaration_Neway_Marketing.pdf")
    
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(HTML_DECLARATION)
        
    cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_file}",
        html_file
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(pdf_file) and os.path.getsize(pdf_file) > 0:
        print(f"[OK] Generated: {pdf_file} ({os.path.getsize(pdf_file)} bytes)")
    else:
        print(f"[FAIL] Error: {res.stderr}")

if __name__ == "__main__":
    generate()
