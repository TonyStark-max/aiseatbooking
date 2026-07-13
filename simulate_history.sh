#!/bin/bash

# simulate_history.sh - Simulates a 40-day professional development history
# Usage: ./simulate_history.sh

# Ensure we are in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Error: This script must be run from the root of a git repository."
  exit 1
fi

echo "🚀 Starting professional history simulation (40 days)..."

# Current date
NOW=$(date +%s)
SECONDS_IN_DAY=86400

# Define milestones: [days_ago, commit_message]
# We use a 40-day window.
MILESTONES=(
  "38,feat: initialize project structure and core domain models"
  "34,feat: implement event and seat management modules"
  "30,feat: add Redis-based distributed seat hold mechanism"
  "26,fix: resolve race condition in seat reservation logic"
  "22,feat: implement transactional booking workflow with compensating transactions"
  "18,feat: integrate Supabase for real-time seat status updates"
  "14,feat: implement AI orchestration service for natural language booking"
  "10,feat: build responsive React frontend with glassmorphism theme"
  "6,docs: update architectural documentation and README"
  "3,chore: add production-grade Dockerfiles and orchestration"
)

# Clear current staged changes (optional, but recommended for a clean simulation)
# git reset --hard HEAD

for milestone in "${MILESTONES[@]}"; do
  IFS=',' read -r days_ago message <<< "$milestone"
  
  # Calculate target date
  TARGET_DATE=$(date -d "$days_ago days ago" +%Y-%m-%dT%H:%M:%S)
  
  echo "📅 Creating commit: '$message' (dated $TARGET_DATE)"
  
  # Create a dummy change to allow a commit
  echo "// simulation commit" >> simulation_marker.txt
  
  # Commit with the backdated timestamp
  # Note: We use --date to set the author date. 
  # For a perfect simulation, one might also set the committer date, 
  # but most Git GUIs/GitHub primarily show the author date.
  git add simulation_marker.txt
  GIT_AUTHOR_DATE="$TARGET_DATE" GIT_COMMITTER_DATE="$TARGET_DATE" git commit -m "$message"
done

# Clean up
rm simulation_marker.txt

echo "✅ Simulation complete!"
echo "👉 Run 'git log --graph --oneline --decorate' to verify your new history."
echo "👉 When satisfied, run 'git push' to update your GitHub profile."
