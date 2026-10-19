# Website languages

Spanish pages remain at their existing URLs. English equivalents are static HTML
under `/en/`; every header contains an EN/ES link to the equivalent page. Page
navigation stays in the selected language without cookies or automatic redirects.

To update content:

1. Edit the Spanish source HTML.
2. Add or update matching text in `translations/en.json`.
3. Run `python3 scripts/build_translations.py`.
4. Commit both the source changes and generated English HTML.

Run `python3 scripts/build_translations.py --check` to verify the checked-in English
pages match their source. The generator uses only Python's standard library and
fails for missing translations. It preserves project names, legal identifiers,
dates, amounts, anchor IDs and external service destinations. English links to
the association's PDFs indicate that those documents remain in Spanish.

Dynamic campaign summaries are localized in `assets/js/campaign.js`; mobile-menu
labels are localized in `assets/js/site.js`. The Google Ads script excludes privacy
contact links from conversion reporting in both languages.
