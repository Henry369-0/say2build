# Security policy

## Reporting a vulnerability

Please do not open a public issue containing secrets or a reproducible exploit. Use GitHub's private vulnerability reporting feature if it is enabled for the repository, or contact the maintainer privately through their GitHub profile.

## Secrets

- Never commit `OPENAI_API_KEY` or other provider keys.
- Browser code must not receive provider secrets.
- `.env` files are ignored by Git.

## Data model

The MVP stores project state on the user's device. Live-AI requests send the compact Project Brain and recent relevant conversation context to the configured model provider. Deployment operators are responsible for accurately documenting any additional logging or data retention they add.
