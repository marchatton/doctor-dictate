#!/bin/bash

# Color codes for terminal output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

# Check if --allow-newer flag is present
if [[ "$*" == *"--allow-newer"* ]]; then
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${RED}║                    ⚠️  SECURITY WARNING ⚠️                     ║${RESET}"
    echo -e "${RED}╠══════════════════════════════════════════════════════════════╣${RESET}"
    echo -e "${RED}║                                                              ║${RESET}"
    echo -e "${RED}║  You are about to OVERRIDE the 24-hour package age policy!  ║${RESET}"
    echo -e "${RED}║                                                              ║${RESET}"
    echo -e "${RED}║  This bypasses security protection against:                 ║${RESET}"
    echo -e "${RED}║    • Supply chain attacks                                   ║${RESET}"
    echo -e "${RED}║    • Malicious package versions                             ║${RESET}"
    echo -e "${RED}║    • Compromised dependencies                               ║${RESET}"
    echo -e "${RED}║                                                              ║${RESET}"
    echo -e "${RED}║  Current policy: Packages must be 1440 minutes old (1 day)  ║${RESET}"
    echo -e "${RED}║                                                              ║${RESET}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "${YELLOW}${BOLD}Are you ABSOLUTELY SURE you want to proceed? ${RESET}"
    echo -e "${YELLOW}This should only be done for critical security patches!${RESET}"
    echo ""
    echo -e "Type ${BOLD}'YES I UNDERSTAND THE RISKS'${RESET} to continue, or anything else to cancel:"
    read -r response

    if [[ "$response" != "YES I UNDERSTAND THE RISKS" ]]; then
        echo ""
        echo -e "${GREEN}✓ Good choice! Installation cancelled for security.${RESET}"
        echo -e "${BLUE}Running normal install with 24-hour age policy...${RESET}"
        echo ""
        # Remove --allow-newer and run normal install
        args="${*//--allow-newer/}"
        exec pnpm install $args
    else
        echo ""
        echo -e "${RED}${BOLD}⚠️  PROCEEDING WITHOUT AGE PROTECTION ⚠️${RESET}"
        echo -e "${RED}This action will be logged.${RESET}"
        echo ""
        # Log the override action
        echo "[$(date)] SECURITY OVERRIDE: Package age check bypassed by user" >> .pnpm-security.log
        # Pass all arguments to pnpm, which includes --allow-newer
        exec pnpm install "$@"
    fi
else
    # Normal install with age protection
    echo -e "${GREEN}✓ Installing with 24-hour package age protection enabled${RESET}"
    exec pnpm install "$@"
fi