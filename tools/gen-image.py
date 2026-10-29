#!/usr/bin/env python3
"""Παραγωγή εικόνας μέσω OpenAI Image API — χωρίς εξαρτήσεις (μόνο stdlib).

Το key διαβάζεται ΜΟΝΟ από το env var OPENAI_API_KEY, που το βάζει ο wrapper
`~/bin/with-openai` από το macOS Keychain. Το key δεν τυπώνεται ποτέ.

Παραδείγματα:
  ~/bin/with-openai python3 tools/gen-image.py "prompt…" --out out.png
  ~/bin/with-openai python3 tools/gen-image.py "prompt…" --ref R000.png --out out.png --size 1536x1024

Με --ref η κλήση πάει στο /v1/images/edits (η εικόνα αναφοράς κρατά τους ήρωες ίδιους).
Δίπλα στην εικόνα γράφεται <όνομα>.prompt.md με μοντέλο, ρυθμίσεις και prompt,
για να ξαναβγεί αν χρειαστεί.
"""
import argparse
import base64
import datetime
import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.request
import uuid

API = "https://api.openai.com/v1/images"
DEFAULT_MODEL = "gpt-image-2.5-flare"

# Κανόνες ύφους που ισχύουν σε ΚΑΘΕ εικόνα του Παιδικού (βλ. ΟΔΗΓΙΕΣ §2)
HOUSE_STYLE = (
    "Gentle simplified flat children's book illustration for a 3-year-old: warm soft flat colors, "
    "rounded friendly shapes, minimal detail, no gradients or realistic textures. "
    "Absolutely NO text, letters, numbers, labels, logos or watermark anywhere in the image."
)


def multipart(fields, files):
    boundary = uuid.uuid4().hex
    out = bytearray()
    for name, value in fields:
        out += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode()
    for name, path in files:
        mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
        fname = os.path.basename(path)
        out += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; "
                f"filename=\"{fname}\"\r\nContent-Type: {mime}\r\n\r\n").encode()
        with open(path, "rb") as fh:
            out += fh.read()
        out += b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={boundary}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("prompt")
    ap.add_argument("--out", required=True, help="αρχείο εξόδου (.png/.jpeg/.webp)")
    ap.add_argument("--ref", action="append", default=[], help="εικόνα αναφοράς (μπορεί πολλές φορές)")
    ap.add_argument("--model", default=DEFAULT_MODEL,
                    help=f"προεπιλογή {DEFAULT_MODEL}· για λεπτές διορθώσεις gpt-image-2.5-sunburst")
    ap.add_argument("--size", default="1024x1024", help="1024x1024 · 1536x1024 · 1024x1536 · auto")
    ap.add_argument("--quality", default="medium", help="low · medium · high · xhigh · max · auto")
    ap.add_argument("--background", default=None, help="transparent · opaque · auto")
    ap.add_argument("--no-house-style", action="store_true", help="χωρίς τους κανόνες ύφους του Παιδικού")
    a = ap.parse_args()

    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("Λείπει το OPENAI_API_KEY — τρέξε το μέσω ~/bin/with-openai.")

    prompt = a.prompt if a.no_house_style else f"{a.prompt}\n\n{HOUSE_STYLE}"
    ext = os.path.splitext(a.out)[1].lower().lstrip(".") or "png"
    fmt = {"jpg": "jpeg"}.get(ext, ext)
    params = {"model": a.model, "prompt": prompt, "size": a.size, "quality": a.quality,
              "output_format": fmt, "n": 1}
    if a.background:
        params["background"] = a.background

    headers = {"Authorization": f"Bearer {key}"}
    if a.ref:
        body, ctype = multipart([(k, str(v)) for k, v in params.items()], [("image[]", p) for p in a.ref])
        url = f"{API}/edits"
    else:
        body, ctype = json.dumps(params).encode(), "application/json"
        url = f"{API}/generations"
    headers["Content-Type"] = ctype

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        detail = re.sub(r"sk-[A-Za-z0-9_*-]+", "sk-…(κρυμμένο)", detail)  # ούτε κομμάτι του key στην έξοδο
        sys.exit(f"OpenAI σφάλμα {e.code}: {detail[:800]}")

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "wb") as fh:
        fh.write(base64.b64decode(data["data"][0]["b64_json"]))

    usage = data.get("usage", {})
    side = os.path.splitext(a.out)[0] + ".prompt.md"
    with open(side, "w", encoding="utf-8") as fh:
        fh.write(f"# {os.path.basename(a.out)}\n\n"
                 f"- Ημερομηνία: {datetime.datetime.now():%Y-%m-%d %H:%M}\n"
                 f"- Μοντέλο: {a.model} · μέγεθος {a.size} · ποιότητα {a.quality}\n"
                 f"- Αναφορές: {', '.join(os.path.basename(p) for p in a.ref) or '—'}\n"
                 f"- Tokens: {json.dumps(usage) if usage else '—'}\n\n"
                 f"## Prompt\n{prompt}\n")
    print(f"OK → {a.out}  (tokens: {usage.get('total_tokens', '?')})")


if __name__ == "__main__":
    main()
