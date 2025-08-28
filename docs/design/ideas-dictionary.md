Here are the top sources for building your psychiatric medication dictionary:
Primary Sources (Free, Authoritative)
1. RxNorm API (Best for drug names)
bash# REST API from NIH - completely free
https://rxnav.nlm.nih.gov/REST/

# Example: Get all names for sertraline
curl "https://rxnav.nlm.nih.gov/REST/rxcui/36437/allrelated.json"
2. FDA Orange Book (Downloadable database)
bash# Download the entire FDA approved drug database
https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files

# Contains: Generic names, brand names, dosages, routes
3. NIMH Medication Guides (Psychiatric-specific)
https://www.nimh.nih.gov/health/topics/mental-health-medications

# Lists all major psychiatric medications by class:
- Antidepressants (SSRIs, SNRIs, TCAs, MAOIs)
- Antipsychotics (typical, atypical)
- Mood stabilizers
- Anxiolytics
Building Your Dictionary
Quick Start Script (Python)
python# scripts/build_med_dictionary.py

import requests
import json

# Common psychiatric medications to start with
psych_meds = [
    # Antidepressants
    "sertraline", "fluoxetine", "escitalopram", "citalopram",
    "venlafaxine", "duloxetine", "bupropion", "mirtazapine",
    
    # Antipsychotics
    "aripiprazole", "quetiapine", "risperidone", "olanzapine",
    "paliperidone", "lurasidone", "cariprazine",
    
    # Mood Stabilizers
    "lithium", "lamotrigine", "valproate", "carbamazepine",
    
    # Anxiolytics
    "lorazepam", "clonazepam", "alprazolam", "buspirone",
    
    # ADHD
    "methylphenidate", "amphetamine", "atomoxetine", "guanfacine"
]

# Add brand names (manual mapping for most common)
brand_mappings = {
    "sertraline": ["zoloft"],
    "fluoxetine": ["prozac"],
    "escitalopram": ["lexapro"],
    "aripiprazole": ["abilify"],
    "quetiapine": ["seroquel"],
    # Add more...
}

# Common dosages
common_dosages = {
    "sertraline": ["25mg", "50mg", "100mg", "150mg", "200mg"],
    "fluoxetine": ["10mg", "20mg", "40mg", "60mg"],
    # Add more...
}
Secondary Sources
4. MedSpell Medical Spell Checker

Has common misspellings
Available on GitHub
Includes phonetic variations

5. PubMed MeSH Terms
https://www.ncbi.nlm.nih.gov/mesh/

Search for "Psychotropic Drugs" to get full hierarchy
For Your Proof of Concept
Start simple - create a JSON file with the 50 most common psychiatric meds:
json{
  "medications": {
    "sertraline": {
      "brand": ["zoloft"],
      "dosages": ["25mg", "50mg", "100mg", "150mg", "200mg"],
      "common_errors": ["sertralene", "surtraline", "certralean"]
    },
    "fluoxetine": {
      "brand": ["prozac"],
      "dosages": ["10mg", "20mg", "40mg", "60mg", "80mg"],
      "common_errors": ["fluoxitine", "fluoxetene"]
    }
  }
}
Practical First Step

Start with top 20 psychiatric drugs (covers 80% of prescriptions)
Add their brand names
Add common dosages
Test with Whisper to find common transcription errors
Build correction mappings based on what Whisper actually gets wrong

This focused approach is better than trying to import thousands of drugs you'll never encounter in psychiatry.