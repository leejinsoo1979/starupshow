
// Mocking the simplified matching logic for testing purposes
// Based on app/api/government-programs/match/route.ts

interface Profile {
    is_youth_startup: boolean;
    industry_category: string;
    region: string;
    business_years: number;
}

interface Program {
    title: string;
    content: string;
    eligibility_criteria: string;
}

// Function to strip HTML (simplified)
function stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '');
}

// Simplified version of the matching logic focused on the issue
function calculateFitScoreTest(profile: Profile, program: Program) {
    const rawContent = [program.title, program.content, program.eligibility_criteria].join(' ');
    const programText = stripHtmlTags(rawContent).toLowerCase();

    let score = 0;
    const breakdown = {
        industry: 0,
        scale: 0,
        region: 0,
        type: 0,
        special: 0,
        disqualified: false,
        reasons: [] as string[]
    };

    // 1. Industry (Assume match for test)
    breakdown.industry = 25; // High match
    score += 25;

    // 2. Scale (Assume match)
    breakdown.scale = 15;
    score += 15;

    // 3. Region (Assume match)
    breakdown.region = 12;
    score += 12;

    // 4. Type (Assume match)
    breakdown.type = 10;
    score += 10;


    // 5. Special Conditions (The part to test)
    const youthKeywords = ['청년', '39세', 'youth', '만39세', '청년창업'];
    const foundYouthKeyword = youthKeywords.find(k => programText.includes(k));

    // Current Logic Simulation (UPDATED WITH FIX)
    const titleHasYouth = program.title.includes('청년');

    if (profile.is_youth_startup && foundYouthKeyword) {
        score += 6;
        breakdown.special += 6;
        breakdown.reasons.push('Youth Match +6');
    }

    // NEW DISQUALIFICATION LOGIC
    if (!profile.is_youth_startup && (titleHasYouth || (foundYouthKeyword && programText.includes('제한')))) {
        breakdown.disqualified = true;
        breakdown.reasons.push(`Disqualified: Youth Program but Profile is not Youth Startup`);
        // Penalize heavily
        score = 0;
        breakdown.industry = 0;
        breakdown.scale = 0;
        breakdown.region = 0;
        breakdown.type = 0;
    } else if (!profile.is_youth_startup && foundYouthKeyword) {
        // Just mention it if not disqualified
        breakdown.reasons.push('Youth Keyword found (0 pts)');
    }

    // Check if it SHOULD be disqualified
    // This is what we want to implement:
    /*
    if (!profile.is_youth_startup && foundYouthKeyword) {
        // If title specifically says "Youth Only" or similar strong implication
        if (program.title.includes('청년') || program.eligibility_criteria.includes('만 39세 이하')) {
            breakdown.disqualified = true;
            score = 0; 
        }
    }
    */

    return { score, breakdown };
}

const nonYouthProfile: Profile = {
    is_youth_startup: false,
    industry_category: 'Information Technology',
    region: 'Seoul',
    business_years: 5
};

const youthProgram: Program = {
    title: '[강동구 청년해냄센터] 고덕비즈밸리 강동U1센터 청년창업공간 입주기업 모집',
    content: '청년 창업가를 위한 공간 지원...',
    eligibility_criteria: '만 19세 ~ 39세 이하 청년'
};

const result = calculateFitScoreTest(nonYouthProfile, youthProgram);
console.log('Result Score:', result.score);
console.log('Breakdown:', result.breakdown);
