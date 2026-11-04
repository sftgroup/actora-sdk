# Contributing

Thanks for your interest in Actora.

## Workflow

1. Fork the repository and create a topic branch.
2. Run the checks below before opening a pull request.
3. Sign off every commit with `git commit -s`.

## Checks

```bash
npm ci
npm run typecheck
npm test
npm run build
```

New or changed public methods need Vitest coverage under `test/`.

## Developer Certificate of Origin

All commits must include a `Signed-off-by` line, certifying the
Developer Certificate of Origin 1.1 (<https://developercertificate.org/>).

## License

By contributing you agree that your contributions are licensed under the MIT
License. The "Actora" name and logo are not licensed — see [TRADEMARK.md](./TRADEMARK.md).
