[direnv](https://direnv.net) lets you define environment variables to be loaded only within certain directories. It's a great way to save secret variables that are project-specific, without cluttering your global shell config.

# Installation

```
brew install direnv
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
```

# Usage

```
echo 'export SECRET_TOKEN="super-secret"' > .envrc
echo 'export API_KEY="12345"' >> .envrc
direnv allow
```

Whenever you `cd` into this folder, the environment variables will load.
# Don't commit the secrets!

Add to `.gitignore`:

```
.envrc
```