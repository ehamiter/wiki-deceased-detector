# Wikipedia Deceased Detector

![Wikipedia Deceased Detector](wiki-deceased.png)

## What it does

This Chrome extension automatically identifies and visually highlights links to deceased individuals on Wikipedia pages. When browsing Wikipedia, the extension analyzes article links in real-time, checking each person's page for indicators of death (such as birth-death date patterns like "1920–1995" or past-tense descriptions like "was an American actor"). 

Deceased individuals' links are then styled with customizable visual cues—by default, a dashed red underline with reduced opacity—allowing you to quickly distinguish between living and deceased people without clicking through to their pages. The extension respects Wikipedia's API rate limits, caches results for performance, and includes user-configurable styling options accessible through the extension's options page.

## Installation

Since this is an unpacked extension, you'll need to load it manually into Chrome:

1. **Clone or download this repository** to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** by toggling the switch in the top-right corner
4. **Click "Load unpacked"** button that appears after enabling Developer Mode
5. **Select the folder** containing this extension's files (the folder with `manifest.json`)
6. The extension should now appear in your extensions list and be active on Wikipedia pages

## Usage

Simply visit any Wikipedia article and the extension will automatically start working. Links to deceased individuals will be highlighted as you browse. You can customize the visual styling by right-clicking the extension icon and selecting "Options".

## Configuration

Access the extension's options page to customize:
- Text color for deceased links
- Font weight and text decoration
- Opacity and background styling
- Custom CSS rules

## Permissions

The extension requires:
- `activeTab`: To analyze links on the current Wikipedia page
- `storage`: To save your style preferences and cache API results
- `host_permissions` for `*.wikipedia.org`: To access Wikipedia's REST API for checking deceased status
