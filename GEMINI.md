# Efficiency Rules

- **Targeted formatting/linting**: Never run prettier or eslint across the entire workspace or tree. Run only on touched files (`git diff --name-only | xargs -r npx prettier --write`).
- **Targeted test execution**: Never invoke raw full-suite `npm test` when working on specific files. Run target tests directly with `node --experimental-strip-types --test <file>` or narrow patterns to avoid multi-thousand-test runs.
- **No full verify locally**: Never run `npm run verify` or `npm run lint` locally. Push to `feat/**`, `fix/**`, `perf/**`, or `ci/**` and let GitHub Actions verify.
