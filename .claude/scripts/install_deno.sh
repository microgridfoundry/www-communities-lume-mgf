#!/bin/bash

# Only install dependencies on remote (web) sessions
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  echo "Remote session detected. Installing Deno..."

  # Check if deno is already installed
  if command -v deno &> /dev/null; then
    echo "Deno is already installed: $(deno --version | head -n 1)"
  else
    echo "Installing Deno..."
    curl -fsSL https://deno.land/install.sh | sh

    # Add deno to PATH for the current session
    export DENO_INSTALL="$HOME/.deno"
    export PATH="$DENO_INSTALL/bin:$PATH"

    # Persist the PATH for future commands in this session
    if [ -n "$CLAUDE_ENV_FILE" ]; then
      echo "export DENO_INSTALL=\"$HOME/.deno\"" >> "$CLAUDE_ENV_FILE"
      echo "export PATH=\"\$DENO_INSTALL/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
    fi

    echo "Deno installation complete: $(deno --version | head -n 1)"
  fi
else
  echo "Local session detected. Skipping Deno installation."
fi
