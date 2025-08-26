// Local Medical Dictionary for PsychScribe
// Contains psychiatric medications, conditions, and terminology
// All data stored locally - no external dependencies

const medicalDictionary = {
  // Psychiatric Medications by Category
  medications: {
    // SSRIs (Selective Serotonin Reuptake Inhibitors)
    ssris: {
      'sertraline': {
        brandNames: ['Zoloft', 'Zoloft XR', 'Lustral'],
        commonDosages: ['25mg', '50mg', '100mg', '150mg', '200mg'],
        category: 'SSRI',
        typicalUse: 'depression, anxiety, OCD, PTSD',
        notes: 'Most commonly prescribed SSRI',
        commonErrors: ['sertralene', 'surtraline', 'certralean', 'sertralin', 'zertraline'],
        dosageErrors: ['25mgs', '50mgs', '100mgs', '25 mg', '50 mg', '100 mg'],
        rxNormId: '36437'
      },
      'fluoxetine': {
        brandNames: ['Prozac', 'Prozac Weekly', 'Sarafem', 'Selfemra'],
        commonDosages: ['10mg', '20mg', '40mg', '60mg', '80mg'],
        category: 'SSRI',
        typicalUse: 'depression, bulimia, OCD',
        notes: 'Long half-life, good for compliance',
        commonErrors: ['fluoxitine', 'fluoxetene', 'fluoxetin', 'prozak', 'prozac'],
        dosageErrors: ['10mgs', '20mgs', '40mgs', '10 mg', '20 mg', '40 mg'],
        rxNormId: '3297'
      },
      'escitalopram': {
        brandNames: ['Lexapro', 'Cipralex', 'Sipralexa'],
        commonDosages: ['5mg', '10mg', '15mg', '20mg'],
        category: 'SSRI',
        typicalUse: 'depression, generalized anxiety',
        notes: 'S-enantiomer of citalopram',
        commonErrors: ['escitalopram', 'escitalopram', 'lexipro', 'lexepro'],
        dosageErrors: ['5mgs', '10mgs', '15mgs', '5 mg', '10 mg', '15 mg'],
        rxNormId: '36567'
      },
      'citalopram': {
        brandNames: ['Celexa'],
        commonDosages: ['10mg', '20mg', '30mg', '40mg'],
        category: 'SSRI',
        typicalUse: 'depression',
        notes: 'QT prolongation risk at higher doses'
      },
      'paroxetine': {
        brandNames: ['Paxil'],
        commonDosages: ['10mg', '20mg', '30mg', '40mg'],
        category: 'SSRI',
        typicalUse: 'depression, anxiety, panic disorder',
        notes: 'Higher risk of withdrawal symptoms'
      },
      'fluvoxamine': {
        brandNames: ['Luvox'],
        commonDosages: ['25mg', '50mg', '100mg', '150mg', '200mg'],
        category: 'SSRI',
        typicalUse: 'OCD, social anxiety disorder',
        notes: 'FDA approved for OCD, good for anxiety'
      },
      'vortioxetine': {
        brandNames: ['Brintellix', 'Trintellix'],
        commonDosages: ['5mg', '10mg', '15mg', '20mg'],
        category: 'SSRI',
        typicalUse: 'major depressive disorder',
        notes: 'Multimodal mechanism, good cognitive effects'
      }
    },

    // SNRIs (Serotonin-Norepinephrine Reuptake Inhibitors)
    snris: {
      'venlafaxine': {
        brandNames: ['Effexor'],
        commonDosages: ['37.5mg', '75mg', '150mg', '225mg', '300mg'],
        category: 'SNRI',
        typicalUse: 'depression, anxiety, panic disorder',
        notes: 'Extended release available'
      },
      'duloxetine': {
        brandNames: ['Cymbalta'],
        commonDosages: ['20mg', '30mg', '40mg', '60mg'],
        category: 'SNRI',
        typicalUse: 'depression, anxiety, fibromyalgia, chronic pain',
        notes: 'Good for comorbid pain conditions'
      },
      'desvenlafaxine': {
        brandNames: ['Pristiq'],
        commonDosages: ['25mg', '50mg', '100mg'],
        category: 'SNRI',
        typicalUse: 'depression',
        notes: 'Active metabolite of venlafaxine'
      },
      'levomilnacipran': {
        brandNames: ['Fetzima'],
        commonDosages: ['20mg', '40mg', '80mg', '120mg'],
        category: 'SNRI',
        typicalUse: 'major depressive disorder',
        notes: 'Norepinephrine selective, good for fatigue'
      },
      'milnacipran': {
        brandNames: ['Savella'],
        commonDosages: ['12.5mg', '25mg', '50mg', '100mg'],
        category: 'SNRI',
        typicalUse: 'fibromyalgia',
        notes: 'FDA approved for fibromyalgia'
      }
    },

    // Atypical Antidepressants
    atypical: {
      'bupropion': {
        brandNames: ['Wellbutrin', 'Zyban'],
        commonDosages: ['75mg', '100mg', '150mg', '200mg', '300mg', '450mg'],
        category: 'Atypical Antidepressant',
        typicalUse: 'depression, seasonal affective disorder, smoking cessation',
        notes: 'Stimulant-like effects, good for fatigue'
      },
      'mirtazapine': {
        brandNames: ['Remeron'],
        commonDosages: ['7.5mg', '15mg', '30mg', '45mg'],
        category: 'Atypical Antidepressant',
        typicalUse: 'depression, insomnia',
        notes: 'Sedating, good for sleep, weight gain risk'
      },
      'trazodone': {
        brandNames: ['Desyrel'],
        commonDosages: ['25mg', '50mg', '100mg', '150mg', '200mg', '300mg'],
        category: 'Atypical Antidepressant',
        typicalUse: 'depression, insomnia',
        notes: 'Often used off-label for sleep'
      },
      'agomelatine': {
        brandNames: ['Valdoxan'],
        commonDosages: ['25mg', '50mg'],
        category: 'Atypical Antidepressant',
        typicalUse: 'major depressive disorder',
        notes: 'Melatonin receptor agonist, good for sleep'
      },
      'vilanterol': {
        brandNames: ['Breo'],
        commonDosages: ['25mcg', '50mcg'],
        category: 'Atypical Antidepressant',
        typicalUse: 'COPD, asthma',
        notes: 'Long-acting beta agonist'
      }
    },

    // Mood Stabilizers
    moodStabilizers: {
      'lithium': {
        brandNames: ['Lithobid', 'Eskalith'],
        commonDosages: ['150mg', '300mg', '450mg', '600mg', '900mg', '1200mg'],
        category: 'Mood Stabilizer',
        typicalUse: 'bipolar disorder, mania',
        notes: 'Requires blood level monitoring, narrow therapeutic index'
      },
      'lamotrigine': {
        brandNames: ['Lamictal', 'Lamictal XR', 'Lamictal ODT'],
        commonDosages: ['25mg', '50mg', '100mg', '150mg', '200mg', '250mg', '300mg'],
        category: 'Mood Stabilizer',
        typicalUse: 'bipolar depression, epilepsy',
        notes: 'Slow titration required, rash risk',
        commonErrors: ['lamotrigin', 'lamictal', 'lamotrigine', 'lamotrigin'],
        dosageErrors: ['25mgs', '50mgs', '100mgs', '25 mg', '50 mg', '100 mg'],
        rxNormId: '10631'
      },
      'valproate': {
        brandNames: ['Depakote'],
        commonDosages: ['250mg', '500mg', '750mg', '1000mg', '1500mg'],
        category: 'Mood Stabilizer',
        typicalUse: 'bipolar disorder, mania, epilepsy',
        notes: 'Teratogenic, requires monitoring'
      },
      'carbamazepine': {
        brandNames: ['Tegretol'],
        commonDosages: ['100mg', '200mg', '300mg', '400mg', '600mg', '800mg'],
        category: 'Mood Stabilizer',
        typicalUse: 'bipolar disorder, epilepsy, trigeminal neuralgia',
        notes: 'Induces liver enzymes, drug interactions'
      },
      'topiramate': {
        brandNames: ['Topamax'],
        commonDosages: ['25mg', '50mg', '100mg', '200mg', '300mg', '400mg'],
        category: 'Mood Stabilizer',
        typicalUse: 'bipolar disorder, epilepsy, migraine prevention',
        notes: 'Weight loss, cognitive side effects'
      },
      'gabapentin': {
        brandNames: ['Neurontin'],
        commonDosages: ['100mg', '300mg', '400mg', '600mg', '800mg', '900mg', '1200mg'],
        category: 'Mood Stabilizer',
        typicalUse: 'anxiety, neuropathic pain, epilepsy',
        notes: 'Off-label for anxiety, good safety profile'
      },
      'pregabalin': {
        brandNames: ['Lyrica'],
        commonDosages: ['25mg', '50mg', '75mg', '100mg', '150mg', '200mg', '225mg', '300mg'],
        category: 'Mood Stabilizer',
        typicalUse: 'generalized anxiety disorder, neuropathic pain, fibromyalgia',
        notes: 'FDA approved for GAD, good for anxiety'
      }
    },

    // Antipsychotics
    antipsychotics: {
      'aripiprazole': {
        brandNames: ['Abilify', 'Abilify Maintena', 'Abilify MyCite'],
        commonDosages: ['2mg', '5mg', '10mg', '15mg', '20mg', '30mg'],
        category: 'Atypical Antipsychotic',
        typicalUse: 'schizophrenia, bipolar disorder, depression augmentation',
        notes: 'Partial dopamine agonist, good side effect profile',
        commonErrors: ['aripiprazol', 'abilify', 'abilifi', 'aripiprazol'],
        dosageErrors: ['2mgs', '5mgs', '10mgs', '2 mg', '5 mg', '10 mg'],
        rxNormId: '258055'
      },
      'risperidone': {
        brandNames: ['Risperdal'],
        commonDosages: ['0.25mg', '0.5mg', '1mg', '2mg', '3mg', '4mg'],
        category: 'Atypical Antipsychotic',
        typicalUse: 'schizophrenia, bipolar disorder, autism',
        notes: 'Prolactin elevation, weight gain risk'
      },
      'quetiapine': {
        brandNames: ['Seroquel'],
        commonDosages: ['25mg', '50mg', '100mg', '200mg', '300mg', '400mg', '600mg', '800mg'],
        category: 'Atypical Antipsychotic',
        typicalUse: 'schizophrenia, bipolar disorder, depression augmentation',
        notes: 'Very sedating, good for sleep'
      },
      'olanzapine': {
        brandNames: ['Zyprexa'],
        commonDosages: ['2.5mg', '5mg', '7.5mg', '10mg', '15mg', '20mg'],
        category: 'Atypical Antipsychotic',
        typicalUse: 'schizophrenia, bipolar disorder',
        notes: 'High weight gain risk, metabolic effects'
      },
      'ziprasidone': {
        brandNames: ['Geodon'],
        commonDosages: ['20mg', '40mg', '60mg', '80mg'],
        category: 'Atypical Antipsychotic',
        typicalUse: 'schizophrenia, bipolar disorder',
        notes: 'Lower weight gain risk, QTc prolongation'
      },
      'paliperidone': {
        brandNames: ['Invega'],
        commonDosages: ['1.5mg', '3mg', '6mg', '9mg', '12mg'],
        category: 'Atypical Antipsychotic',
        typicalUse: 'schizophrenia, schizoaffective disorder',
        notes: 'Active metabolite of risperidone, monthly injection available'
      },
      'lurasidone': {
        brandNames: ['Latuda'],
        commonDosages: ['20mg', '40mg', '60mg', '80mg', '120mg', '160mg'],
        category: 'Atypical Antipsychotic',
        typicalUse: 'schizophrenia, bipolar depression',
        notes: 'Good metabolic profile, take with food'
      },
      'brexpiprazole': {
        brandNames: ['Rexulti'],
        commonDosages: ['0.25mg', '0.5mg', '1mg', '2mg', '3mg', '4mg'],
        category: 'Atypical Antipsychotic',
        typicalUse: 'schizophrenia, depression augmentation',
        notes: 'Similar to aripiprazole, good tolerability'
      },
      'cariprazine': {
        brandNames: ['Vraylar'],
        commonDosages: ['1.5mg', '3mg', '4.5mg', '6mg'],
        category: 'Atypical Antipsychotic',
        typicalUse: 'schizophrenia, bipolar disorder',
        notes: 'Dopamine D3 partial agonist, good for negative symptoms'
      }
    },

    // Benzodiazepines
    benzodiazepines: {
      'alprazolam': {
        brandNames: ['Xanax'],
        commonDosages: ['0.25mg', '0.5mg', '1mg', '2mg'],
        category: 'Benzodiazepine',
        typicalUse: 'anxiety, panic disorder',
        notes: 'Short-acting, high abuse potential'
      },
      'lorazepam': {
        brandNames: ['Ativan'],
        commonDosages: ['0.5mg', '1mg', '2mg'],
        category: 'Benzodiazepine',
        typicalUse: 'anxiety, panic disorder, acute agitation',
        notes: 'Intermediate-acting, good for acute symptoms'
      },
      'clonazepam': {
        brandNames: ['Klonopin'],
        commonDosages: ['0.5mg', '1mg', '2mg'],
        category: 'Benzodiazepine',
        typicalUse: 'panic disorder, social anxiety, seizures',
        notes: 'Long-acting, good for maintenance'
      },
      'diazepam': {
        brandNames: ['Valium'],
        commonDosages: ['2mg', '5mg', '10mg'],
        category: 'Benzodiazepine',
        typicalUse: 'anxiety, muscle spasm, alcohol withdrawal',
        notes: 'Very long-acting, active metabolites'
      },
      'temazepam': {
        brandNames: ['Restoril'],
        commonDosages: ['7.5mg', '15mg', '30mg'],
        category: 'Benzodiazepine',
        typicalUse: 'insomnia',
        notes: 'Intermediate-acting, good for sleep'
      },
      'triazolam': {
        brandNames: ['Halcion'],
        commonDosages: ['0.125mg', '0.25mg'],
        category: 'Benzodiazepine',
        typicalUse: 'insomnia',
        notes: 'Short-acting, rapid onset'
      },
      'oxazepam': {
        brandNames: ['Serax'],
        commonDosages: ['10mg', '15mg', '30mg'],
        category: 'Benzodiazepine',
        typicalUse: 'anxiety, alcohol withdrawal',
        notes: 'Short-acting, good for elderly'
      }
    },

    // Sleep Medications
    sleepMedications: {
      'zolpidem': {
        brandNames: ['Ambien'],
        commonDosages: ['5mg', '10mg'],
        category: 'Non-Benzodiazepine Hypnotic',
        typicalUse: 'insomnia',
        notes: 'Z-drug, good for sleep onset'
      },
      'zaleplon': {
        brandNames: ['Sonata'],
        commonDosages: ['5mg', '10mg'],
        category: 'Non-Benzodiazepine Hypnotic',
        typicalUse: 'insomnia',
        notes: 'Ultra-short acting, good for middle-of-night awakening'
      },
      'eszopiclone': {
        brandNames: ['Lunesta'],
        commonDosages: ['1mg', '2mg', '3mg'],
        category: 'Non-Benzodiazepine Hypnotic',
        typicalUse: 'insomnia',
        notes: 'Longer duration, good for sleep maintenance'
      },
      'ramelteon': {
        brandNames: ['Rozerem'],
        commonDosages: ['8mg'],
        category: 'Melatonin Receptor Agonist',
        typicalUse: 'insomnia',
        notes: 'Natural mechanism, good for circadian rhythm'
      },
      'suvorexant': {
        brandNames: ['Belsomra'],
        commonDosages: ['5mg', '10mg', '15mg', '20mg'],
        category: 'Orexin Receptor Antagonist',
        typicalUse: 'insomnia',
        notes: 'New mechanism, good for sleep maintenance'
      }
    },

    // Stimulants
    stimulants: {
      'methylphenidate': {
        brandNames: ['Ritalin', 'Concerta', 'Focalin'],
        commonDosages: ['5mg', '10mg', '15mg', '20mg', '30mg', '40mg', '54mg'],
        category: 'Stimulant',
        typicalUse: 'ADHD, narcolepsy',
        notes: 'Multiple formulations available'
      },
      'amphetamine': {
        brandNames: ['Adderall', 'Dexedrine'],
        commonDosages: ['5mg', '10mg', '15mg', '20mg', '30mg'],
        category: 'Stimulant',
        typicalUse: 'ADHD, narcolepsy',
        notes: 'Mixed amphetamine salts'
      },
      'lisdexamfetamine': {
        brandNames: ['Vyvanse'],
        commonDosages: ['10mg', '20mg', '30mg', '40mg', '50mg', '60mg', '70mg'],
        category: 'Stimulant',
        typicalUse: 'ADHD, binge eating disorder',
        notes: 'Prodrug, lower abuse potential'
      },
      'dexmethylphenidate': {
        brandNames: ['Focalin'],
        commonDosages: ['2.5mg', '5mg', '10mg', '15mg', '20mg'],
        category: 'Stimulant',
        typicalUse: 'ADHD',
        notes: 'D-isomer of methylphenidate, less side effects'
      },
      'dextroamphetamine': {
        brandNames: ['Dexedrine', 'Zenzedi'],
        commonDosages: ['5mg', '10mg', '15mg', '20mg', '30mg'],
        category: 'Stimulant',
        typicalUse: 'ADHD, narcolepsy',
        notes: 'D-isomer only, more potent than mixed salts'
      }
    },

    // Non-Stimulant ADHD Medications
    nonStimulantADHD: {
      'atomoxetine': {
        brandNames: ['Strattera'],
        commonDosages: ['10mg', '18mg', '25mg', '40mg', '60mg', '80mg', '100mg'],
        category: 'Non-Stimulant ADHD Medication',
        typicalUse: 'ADHD',
        notes: 'Norepinephrine reuptake inhibitor, good for comorbid anxiety'
      },
      'guanfacine': {
        brandNames: ['Intuniv', 'Tenex'],
        commonDosages: ['1mg', '2mg', '3mg', '4mg'],
        category: 'Non-Stimulant ADHD Medication',
        typicalUse: 'ADHD, hypertension',
        notes: 'Alpha-2 agonist, good for hyperactivity and impulsivity'
      },
      'clonidine': {
        brandNames: ['Kapvay', 'Catapres'],
        commonDosages: ['0.1mg', '0.2mg', '0.3mg'],
        category: 'Non-Stimulant ADHD Medication',
        typicalUse: 'ADHD, hypertension, Tourette syndrome',
        notes: 'Alpha-2 agonist, good for sleep and tics'
      }
    }
  },

  // Psychiatric Conditions and Disorders
  conditions: {
    moodDisorders: {
      'major depressive disorder': {
        category: 'Mood Disorder',
        symptoms: ['depressed mood', 'anhedonia', 'weight changes', 'sleep changes', 'psychomotor changes', 'fatigue', 'worthlessness', 'concentration problems', 'suicidal thoughts'],
        severity: ['mild', 'moderate', 'severe', 'with psychotic features']
      },
      'bipolar disorder': {
        category: 'Mood Disorder',
        types: ['bipolar I', 'bipolar II', 'cyclothymia'],
        manicSymptoms: ['elevated mood', 'increased energy', 'decreased need for sleep', 'racing thoughts', 'grandiosity', 'risk-taking behavior'],
        depressiveSymptoms: ['depressed mood', 'anhedonia', 'fatigue', 'worthlessness', 'suicidal thoughts']
      },
      'persistent depressive disorder': {
        category: 'Mood Disorder',
        symptoms: ['chronic depressed mood', 'low self-esteem', 'hopelessness', 'fatigue', 'sleep problems', 'appetite changes'],
        duration: '2+ years'
      }
    },

    anxietyDisorders: {
      'generalized anxiety disorder': {
        category: 'Anxiety Disorder',
        symptoms: ['excessive worry', 'restlessness', 'fatigue', 'concentration problems', 'irritability', 'muscle tension', 'sleep problems'],
        duration: '6+ months'
      },
      'panic disorder': {
        category: 'Anxiety Disorder',
        symptoms: ['panic attacks', 'fear of future attacks', 'avoidance behavior', 'chest pain', 'shortness of breath', 'dizziness', 'nausea'],
        features: ['with or without agoraphobia']
      },
      'social anxiety disorder': {
        category: 'Anxiety Disorder',
        symptoms: ['fear of social situations', 'fear of judgment', 'avoidance of social interactions', 'physical symptoms in social situations'],
        typicalOnset: 'adolescence or early adulthood'
      }
    },

    psychoticDisorders: {
      'schizophrenia': {
        category: 'Psychotic Disorder',
        positiveSymptoms: ['hallucinations', 'delusions', 'disorganized speech', 'disorganized behavior'],
        negativeSymptoms: ['flat affect', 'alogia', 'avolition', 'anhedonia', 'social withdrawal'],
        cognitiveSymptoms: ['attention problems', 'memory problems', 'executive dysfunction']
      },
      'schizoaffective disorder': {
        category: 'Psychotic Disorder',
        features: ['psychotic symptoms', 'mood episodes', 'mood symptoms present for majority of illness'],
        types: ['bipolar type', 'depressive type']
      }
    },

    otherDisorders: {
      'attention-deficit/hyperactivity disorder': {
        category: 'Neurodevelopmental Disorder',
        types: ['combined presentation', 'predominantly inattentive', 'predominantly hyperactive-impulsive'],
        symptoms: ['inattention', 'hyperactivity', 'impulsivity'],
        typicalOnset: 'childhood'
      },
      'obsessive-compulsive disorder': {
        category: 'Obsessive-Compulsive and Related Disorder',
        symptoms: ['obsessions', 'compulsions', 'anxiety relief from compulsions'],
        commonThemes: ['contamination', 'symmetry', 'harm', 'unwanted thoughts']
      },
      'post-traumatic stress disorder': {
        category: 'Trauma and Stressor-Related Disorder',
        symptoms: ['intrusive memories', 'avoidance', 'negative changes in thinking and mood', 'changes in arousal and reactivity'],
        required: 'exposure to actual or threatened death, serious injury, or sexual violence'
      },
      'borderline personality disorder': {
        category: 'Personality Disorder',
        symptoms: ['emotional instability', 'impulsive behavior', 'unstable relationships', 'identity disturbance', 'chronic emptiness'],
        features: ['splitting', 'fear of abandonment', 'self-harm behaviors']
      },
      'narcissistic personality disorder': {
        category: 'Personality Disorder',
        symptoms: ['grandiosity', 'need for admiration', 'lack of empathy', 'sense of entitlement', 'envy of others'],
        types: ['overt', 'covert']
      },
      'antisocial personality disorder': {
        category: 'Personality Disorder',
        symptoms: ['disregard for others', 'impulsivity', 'aggression', 'irresponsibility', 'lack of remorse'],
        features: ['conduct disorder in childhood', 'criminal behavior']
      },
      'eating disorders': {
        category: 'Feeding and Eating Disorders',
        types: ['anorexia nervosa', 'bulimia nervosa', 'binge eating disorder', 'avoidant restrictive food intake disorder'],
        symptoms: ['distorted body image', 'preoccupation with food', 'compensatory behaviors', 'weight fluctuations']
      },
      'substance use disorders': {
        category: 'Substance-Related and Addictive Disorders',
        substances: ['alcohol', 'opioids', 'stimulants', 'cannabis', 'benzodiazepines'],
        symptoms: ['tolerance', 'withdrawal', 'loss of control', 'continued use despite harm'],
        severity: ['mild', 'moderate', 'severe']
      },
      'autism spectrum disorder': {
        category: 'Neurodevelopmental Disorder',
        symptoms: ['social communication deficits', 'restricted interests', 'repetitive behaviors', 'sensory sensitivities'],
        levels: ['level 1 (requiring support)', 'level 2 (requiring substantial support)', 'level 3 (requiring very substantial support)']
      },
      'tourette syndrome': {
        category: 'Tic Disorder',
        symptoms: ['motor tics', 'vocal tics', 'premonitory urges', 'tic suppression'],
        features: ['onset before age 18', 'tics change over time', 'waxing and waning course']
      }
    }
  },

  // Common Medical Terms and Abbreviations
  terminology: {
    abbreviations: {
      'ADHD': 'Attention-Deficit/Hyperactivity Disorder',
      'OCD': 'Obsessive-Compulsive Disorder',
      'PTSD': 'Post-Traumatic Stress Disorder',
      'GAD': 'Generalized Anxiety Disorder',
      'MDD': 'Major Depressive Disorder',
      'BD': 'Bipolar Disorder',
      'SSRI': 'Selective Serotonin Reuptake Inhibitor',
      'SNRI': 'Serotonin-Norepinephrine Reuptake Inhibitor',
      'PRN': 'as needed',
      'BID': 'twice daily',
      'TID': 'three times daily',
      'QID': 'four times daily',
      'QD': 'once daily',
      'QHS': 'at bedtime',
      'QAM': 'in the morning',
      'BPD': 'Borderline Personality Disorder',
      'NPD': 'Narcissistic Personality Disorder',
      'ASPD': 'Antisocial Personality Disorder',
      'ASD': 'Autism Spectrum Disorder',
      'TS': 'Tourette Syndrome',
      'ED': 'Eating Disorder',
      'SUD': 'Substance Use Disorder',
      'GAD': 'Generalized Anxiety Disorder',
      'SAD': 'Social Anxiety Disorder',
      'PD': 'Panic Disorder',
      'SCZ': 'Schizophrenia',
      'SAD': 'Seasonal Affective Disorder',
      'PMDD': 'Premenstrual Dysphoric Disorder',
      'PMS': 'Premenstrual Syndrome',
      'PME': 'Premenstrual Exacerbation',
      'PMR': 'Premenstrual Relief',
      'PMT': 'Premenstrual Tension',
      'PMV': 'Premenstrual Variant',
      'PMW': 'Premenstrual Worsening',
      'PMX': 'Premenstrual Exacerbation',
      'PMY': 'Premenstrual Yearning',
      'PMZ': 'Premenstrual Zeal'
    },

    units: {
      'mg': 'milligrams',
      'mcg': 'micrograms',
      'ml': 'milliliters',
      'cc': 'cubic centimeters',
      'tablet': 'tablet',
      'capsule': 'capsule',
      'injection': 'injection',
      'patch': 'transdermal patch'
    },

    frequency: {
      'daily': 'once per day',
      'twice daily': 'two times per day',
      'three times daily': 'three times per day',
      'four times daily': 'four times per day',
      'every 4 hours': 'every 4 hours',
      'every 6 hours': 'every 6 hours',
      'every 8 hours': 'every 8 hours',
      'every 12 hours': 'every 12 hours',
      'as needed': 'when symptoms occur',
      'at bedtime': 'before sleep',
      'in the morning': 'upon waking'
    }
  },

  // Common transcription errors and phonetic variations
  transcriptionErrors: {
    // Common Whisper transcription errors
    commonMistakes: {
      'sertraline': ['sertralene', 'surtraline', 'certralean', 'sertralin', 'zertraline'],
      'fluoxetine': ['fluoxitine', 'fluoxetene', 'fluoxetin', 'prozak', 'prozac'],
      'escitalopram': ['escitalopram', 'escitalopram', 'lexipro', 'lexepro'],
      'aripiprazole': ['aripiprazol', 'abilify', 'abilifi', 'aripiprazol'],
      'lamotrigine': ['lamotrigin', 'lamictal', 'lamotrigine', 'lamotrigin'],
      'quetiapine': ['quetiapin', 'seroquel', 'quetiapin'],
      'risperidone': ['risperidon', 'risperdal', 'risperidon'],
      'olanzapine': ['olanzapin', 'zyprexa', 'olanzapin'],
      'venlafaxine': ['venlafaxin', 'effexor', 'venlafaxin'],
      'duloxetine': ['duloxetin', 'cymbalta', 'duloxetin'],
      'bupropion': ['bupropin', 'wellbutrin', 'bupropin'],
      'mirtazapine': ['mirtazapin', 'remeron', 'mirtazapin'],
      'lithium': ['lithum', 'lithium', 'lithum'],
      'valproate': ['valproat', 'depakote', 'valproat'],
      'carbamazepine': ['carbamazepin', 'tegretol', 'carbamazepin'],
      'methylphenidate': ['methylphenidat', 'ritalin', 'methylphenidat'],
      'amphetamine': ['amphetamin', 'adderall', 'amphetamin'],
      'atomoxetine': ['atomoxetin', 'strattera', 'atomoxetin'],
      'alprazolam': ['alprazolam', 'xanax', 'alprazolam'],
      'lorazepam': ['lorazepam', 'ativan', 'lorazepam'],
      'clonazepam': ['clonazepam', 'klonopin', 'clonazepam'],
      'diazepam': ['diazepam', 'valium', 'diazepam']
    },

    // Dosage transcription errors
    dosageErrors: {
      'mg': ['mgs', 'mg\'s', 'milligrams', 'milligram', 'mg.'],
      'mcg': ['mcgs', 'mcg\'s', 'micrograms', 'microgram', 'mcg.'],
      'ml': ['mls', 'ml\'s', 'milliliters', 'milliliter', 'ml.'],
      'tablet': ['tablets', 'tab', 'tabs', 'pill', 'pills'],
      'capsule': ['capsules', 'cap', 'caps', 'capsul'],
      'injection': ['injections', 'inj', 'inject', 'shot', 'shots']
    },

    // Phonetic variations (common speech-to-text errors)
    phoneticVariations: {
      'sertraline': ['sertralene', 'surtraline', 'certralean'],
      'fluoxetine': ['fluoxitine', 'fluoxetene', 'floxitine'],
      'escitalopram': ['escitalopram', 'escitalopram', 'lexipro'],
      'aripiprazole': ['aripiprazol', 'aripiprazol', 'aripiprazol'],
      'lamotrigine': ['lamotrigin', 'lamotrigin', 'lamotrigin'],
      'quetiapine': ['quetiapin', 'quetiapin', 'quetiapin'],
      'risperidone': ['risperidon', 'risperidon', 'risperidon'],
      'olanzapine': ['olanzapin', 'olanzapin', 'olanzapin'],
      'venlafaxine': ['venlafaxin', 'venlafaxin', 'venlafaxin'],
      'duloxetine': ['duloxetin', 'duloxetin', 'duloxetin']
    }
  },

  // Validation functions
  validate: {
    // Check if a medication name exists in the dictionary (including errors)
    isMedication: (name) => {
      const normalizedName = name.toLowerCase().trim();
      
      // Direct match
      for (const category of Object.values(medicalDictionary.medications)) {
        if (normalizedName in category) return true;
      }
      
      // Check common errors
      for (const category of Object.values(medicalDictionary.medications)) {
        for (const [medName, medInfo] of Object.entries(category)) {
          if (medInfo.commonErrors && medInfo.commonErrors.includes(normalizedName)) {
            return true;
          }
        }
      }
      
      return false;
    },

    // Get medication info including error corrections
    getMedicationInfo: (name) => {
      const normalizedName = name.toLowerCase().trim();
      
      // Direct match
      for (const category of Object.values(medicalDictionary.medications)) {
        if (normalizedName in category) {
          return category[normalizedName];
        }
      }
      
      // Check common errors and return corrected info
      for (const category of Object.values(medicalDictionary.medications)) {
        for (const [medName, medInfo] of Object.entries(category)) {
          if (medInfo.commonErrors && medInfo.commonErrors.includes(normalizedName)) {
            return {
              ...medInfo,
              correctedName: medName,
              wasError: true
            };
          }
        }
      }
      
      return null;
    },

    // Check if a dosage format is valid (including common errors)
    isValidDosage: (dosage) => {
      const normalizedDosage = dosage.toLowerCase().trim();
      
      // Standard format
      const dosagePattern = /^\d+(\.\d+)?\s*(mg|mcg|ml|g|tablet|capsule|injection|patch)$/i;
      if (dosagePattern.test(normalizedDosage)) return true;
      
      // Check for common dosage errors
      const commonErrorPatterns = [
        /^\d+(\.\d+)?\s*(mgs|mg's|milligrams)$/i,
        /^\d+(\.\d+)?\s*mg\s*$/i,
        /^\d+(\.\d+)?\s*(tablets|capsules|pills)$/i
      ];
      
      return commonErrorPatterns.some(pattern => pattern.test(normalizedDosage));
    },

    // Get corrected medication name from error
    getCorrectedMedicationName: (errorName) => {
      const normalizedError = errorName.toLowerCase().trim();
      
      for (const category of Object.values(medicalDictionary.medications)) {
        for (const [medName, medInfo] of Object.entries(category)) {
          if (medInfo.commonErrors && medInfo.commonErrors.includes(normalizedError)) {
            return medName;
          }
        }
      }
      
      return null;
    },

    // Get corrected dosage format
    getCorrectedDosage: (dosage) => {
      const normalizedDosage = dosage.toLowerCase().trim();
      
      // Remove common errors
      let corrected = normalizedDosage
        .replace(/\s*mgs?\s*$/i, 'mg')
        .replace(/\s*mg's\s*$/i, 'mg')
        .replace(/\s*milligrams\s*$/i, 'mg')
        .replace(/\s*tablets?\s*$/i, 'tablet')
        .replace(/\s*capsules?\s*$/i, 'capsule')
        .replace(/\s*pills?\s*$/i, 'tablet');
      
      return corrected;
    },

    // Check if text contains transcription errors and suggest corrections
    checkTranscriptionErrors: (text) => {
      const words = text.toLowerCase().split(/\s+/);
      const corrections = [];
      
      for (const word of words) {
        // Check medication name errors
        for (const [correctName, errors] of Object.entries(medicalDictionary.transcriptionErrors.commonMistakes)) {
          if (errors.includes(word)) {
            corrections.push({
              original: word,
              corrected: correctName,
              type: 'medication',
              confidence: 'high'
            });
          }
        }
        
        // Check dosage errors
        for (const [correctUnit, errors] of Object.entries(medicalDictionary.transcriptionErrors.dosageErrors)) {
          if (errors.includes(word)) {
            corrections.push({
              original: word,
              corrected: correctUnit,
              type: 'dosage',
              confidence: 'high'
            });
          }
        }
      }
      
      return corrections;
    },

    // Get accuracy score for transcription
    getTranscriptionAccuracy: (transcript, expectedTerms) => {
      let correctCount = 0;
      let totalCount = expectedTerms.length;
      const corrections = [];
      
      for (const expectedTerm of expectedTerms) {
        const normalizedExpected = expectedTerm.toLowerCase();
        const found = transcript.toLowerCase().includes(normalizedExpected);
        
        if (found) {
          correctCount++;
        } else {
          // Check for common errors
          const errorCorrections = medicalDictionary.validate.checkTranscriptionErrors(transcript);
          const hasCorrection = errorCorrections.some(corr => 
            corr.corrected.toLowerCase() === normalizedExpected
          );
          
          if (hasCorrection) {
            correctCount++;
            corrections.push(...errorCorrections.filter(corr => 
              corr.corrected.toLowerCase() === normalizedExpected
            ));
          }
        }
      }
      
      const accuracy = (correctCount / totalCount) * 100;
      
      return {
        accuracy: accuracy,
        correctCount: correctCount,
        totalCount: totalCount,
        corrections: corrections,
        passed: accuracy >= 95
      };
    },

    // Get medication information
    getMedicationInfo: (name) => {
      const normalizedName = name.toLowerCase().trim();
      for (const category of Object.values(medicalDictionary.medications)) {
        if (normalizedName in category) {
          return category[normalizedName];
        }
      }
      return null;
    },

    // Check if a condition exists
    isCondition: (name) => {
      const normalizedName = name.toLowerCase().trim();
      for (const category of Object.values(medicalDictionary.conditions)) {
        if (normalizedName in category) return true;
      }
      return false;
    },

    // Get condition information
    getConditionInfo: (name) => {
      const normalizedName = name.toLowerCase().trim();
      for (const category of Object.values(medicalDictionary.conditions)) {
        if (normalizedName in category) {
          return category[normalizedName];
        }
      }
      return null;
    },

    // Check if a dosage format is valid
    isValidDosage: (dosage) => {
      const dosagePattern = /^\d+(\.\d+)?\s*(mg|mcg|ml|g|tablet|capsule|injection|patch)$/i;
      return dosagePattern.test(dosage);
    },

    // Get all medications in a category
    getMedicationsByCategory: (category) => {
      return medicalDictionary.medications[category] || {};
    },

    // Search medications by partial name
    searchMedications: (query) => {
      const results = [];
      const normalizedQuery = query.toLowerCase().trim();
      
      for (const [categoryName, category] of Object.entries(medicalDictionary.medications)) {
        for (const [medName, medInfo] of Object.entries(category)) {
          if (medName.includes(normalizedQuery) || 
              medInfo.brandNames.some(brand => brand.toLowerCase().includes(normalizedQuery))) {
            results.push({
              name: medName,
              category: categoryName,
              ...medInfo
            });
          }
        }
      }
      
      return results;
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = medicalDictionary;
} else if (typeof window !== 'undefined') {
  window.medicalDictionary = medicalDictionary;
}
