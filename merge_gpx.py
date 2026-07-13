#!/usr/bin/env python3
"""Merge all ght-day*.gpx into one GPX — no data loss, no modification.

Result: GHT-merged.gpx
Each day = one <trkseg>, all <wpt> preserved, namespaces intact.
"""

import re, sys, xml.etree.ElementTree as ET
from pathlib import Path

GPX_NS = "http://www.topografix.com/GPX/1/1"
PV_NS = "https://peakvisor.com/gpx/ext/1"
GPXX_NS = "http://www.garmin.com/xmlschemas/GpxExtensions/v3"
GPXTPX_NS = "http://www.garmin.com/xmlschemas/TrackPointExtension/v2"
XSI_NS = "http://www.w3.org/2001/XMLSchema-instance"

# Register namespaces so tostring uses correct prefixes
for prefix, uri in [
    ("", GPX_NS),
    ("pv", PV_NS),
    ("gpxx", GPXX_NS),
    ("gpxtpx", GPXTPX_NS),
    ("xsi", XSI_NS),
]:
    ET.register_namespace(prefix, uri)


def day_num(path):
    m = re.search(r'ghtday(\d+)[-\s]', Path(path).stem.lower())
    return int(m.group(1)) if m else 9999


def merge_files(input_paths, output_path):
    files = list(input_paths)
    if not files:
        print("No GPX files", file=sys.stderr)
        sys.exit(1)

    files.sort(key=day_num)
    print(f"Processing {len(files)} files...")

    all_wpt_xml = []
    all_seg_xml = []
    ns_line = ""
    gpx_attrs_line = ""

    for i, fpath in enumerate(files):
        text = Path(fpath).read_text(encoding="utf-8")
        text = re.sub(r'^#gpx\s+\S+\s*\n', '', text).strip()

        try:
            root = ET.fromstring(text)
        except ET.ParseError as e:
            print(f"  SKIP {Path(fpath).name} — {e}")
            continue

        if i == 0:
            meta = root.find(f"{{{GPX_NS}}}metadata")
            if meta is not None:
                name_el = meta.find(f"{{{GPX_NS}}}name")
                if name_el is not None:
                    name_el.text = "GHT Full Track"
                # Use tostring — with registered namespaces it works correctly now
                metadata_xml = ET.tostring(meta, encoding="unicode")

        # Waypoints
        for wpt in root.findall(f"{{{GPX_NS}}}wpt"):
            all_wpt_xml.append(ET.tostring(wpt, encoding="unicode"))

        # Track segments
        total_pts = 0
        for trk in root.findall(f"{{{GPX_NS}}}trk"):
            for seg in trk.findall(f"{{{GPX_NS}}}trkseg"):
                pts = seg.findall(f"{{{GPX_NS}}}trkpt")
                total_pts += len(pts)
                if len(pts) < 2:
                    continue
                seg_xml = ET.tostring(seg, encoding="unicode")
                # Insert day info as <name> inside the segment
                dname = f"Day {day_num(fpath)} — {Path(fpath).stem}"
                seg_xml = seg_xml.replace(
                    f'<trkseg xmlns="{GPX_NS}">',
                    f'<trkseg><name>{dname}</name>'
                )
                all_seg_xml.append(seg_xml)

        nwpt = len(list(root.findall(f"{{{GPX_NS}}}wpt")))
        print(f"  [{i+1}/{len(files)}] {Path(fpath).name}: {nwpt} wpt, {total_pts} trkpt")

    if not all_seg_xml:
        print("No segments!", file=sys.stderr)
        sys.exit(1)

    # Build output
    parts = []
    parts.append('<?xml version="1.0" encoding="UTF-8"?>')
    parts.append(
        '<gpx version="1.1" creator="PeakVisorWeb"'
        ' xmlns="http://www.topografix.com/GPX/1/1"'
        ' xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3"'
        ' xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v2"'
        ' xmlns:pv="https://peakvisor.com/gpx/ext/1"'
        ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
        ' xsi:schemaLocation="http://www.topografix.com/GPX/1/1'
        ' http://www.topografix.com/GPX/1/1/gpx.xsd'
        ' http://www.garmin.com/xmlschemas/GpxExtensions/v3'
        ' http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd'
        ' http://www.garmin.com/xmlschemas/TrackPointExtension/v2'
        ' http://www.garmin.com/xmlschemas/TrackPointExtensionv2.xsd">'
    )

    # Metadata
    parts.append(metadata_xml)

    # Waypoints
    for wxml in all_wpt_xml:
        parts.append("  " + wxml.strip())

    # Track
    parts.append("  <trk>")
    parts.append(f"    <name>GHT Full Track ({len(files)} days)</name>")
    for sxml in all_seg_xml:
        for line in sxml.splitlines():
            parts.append("    " + line)
    parts.append("  </trk>")
    parts.append("</gpx>")

    result = "\n".join(parts) + "\n"
    Path(output_path).write_text(result, encoding="utf-8")
    print(f"\nDone → {output_path}")
    print(f"  Waypoints: {len(all_wpt_xml)}")
    print(f"  Segments:  {len(all_seg_xml)}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} OUTPUT.gpx FILES...")
        sys.exit(1)
    merge_files(sys.argv[2:], sys.argv[1])
