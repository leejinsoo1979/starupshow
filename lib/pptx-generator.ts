import PptxGenJS from 'pptxgenjs'

interface SlideContent {
    id: string
    type: string
    title: string
    subtitle?: string
    content: any
}

// Color scheme
const COLORS = {
    primary: '6366F1', // accent/indigo
    secondary: '3B82F6',
    background: '18181B', // zinc-900
    backgroundLight: '27272A', // zinc-800
    text: 'FFFFFF',
    textMuted: 'A1A1AA', // zinc-400
    success: '22C55E',
    warning: 'F59E0B',
    danger: 'EF4444',
    info: '06B6D4'
}

export async function generatePPTX(slides: SlideContent[], title: string): Promise<Blob> {
    const pptx = new PptxGenJS()

    // Set presentation properties
    pptx.author = 'StartupShow AI'
    pptx.title = title
    pptx.subject = '사업계획서'
    pptx.company = 'StartupShow'

    // Define master slide
    pptx.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { color: COLORS.background },
        objects: [
            // Footer
            {
                text: {
                    text: title,
                    options: {
                        x: 0.5,
                        y: 5.3,
                        w: '90%',
                        h: 0.3,
                        fontSize: 8,
                        color: COLORS.textMuted,
                        align: 'left'
                    }
                }
            }
        ]
    })

    // Generate each slide
    for (const slideData of slides) {
        const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' })

        switch (slideData.type) {
            case 'cover':
                generateCoverSlide(slide, slideData)
                break
            case 'problem':
                generateProblemSlide(slide, slideData)
                break
            case 'solution':
                generateSolutionSlide(slide, slideData)
                break
            case 'market':
                generateMarketSlide(slide, slideData)
                break
            case 'business-model':
                generateBusinessModelSlide(slide, slideData)
                break
            case 'product':
                generateProductSlide(slide, slideData)
                break
            case 'competition':
                generateCompetitionSlide(slide, slideData)
                break
            case 'gtm':
                generateGTMSlide(slide, slideData)
                break
            case 'marketing':
                generateMarketingSlide(slide, slideData)
                break
            case 'team':
                generateTeamSlide(slide, slideData)
                break
            case 'roadmap':
                generateRoadmapSlide(slide, slideData)
                break
            case 'revenue':
                generateRevenueSlide(slide, slideData)
                break
            case 'financials':
                generateFinancialsSlide(slide, slideData)
                break
            case 'investment':
                generateInvestmentSlide(slide, slideData)
                break
            case 'contact':
                generateContactSlide(slide, slideData)
                break
            default:
                generateDefaultSlide(slide, slideData)
        }
    }

    // Generate and return blob
    const blob = await pptx.write({ outputType: 'blob' }) as Blob
    return blob
}

function generateCoverSlide(slide: any, data: SlideContent) {
    // Logo placeholder
    slide.addShape('rect', {
        x: 4.25,
        y: 1.5,
        w: 1.5,
        h: 1.5,
        fill: { color: COLORS.primary },
        rounding: true
    })

    // Title
    slide.addText(data.title, {
        x: 0.5,
        y: 3.2,
        w: '90%',
        h: 0.8,
        fontSize: 44,
        bold: true,
        color: COLORS.text,
        align: 'center'
    })

    // Subtitle
    if (data.subtitle) {
        slide.addText(data.subtitle, {
            x: 0.5,
            y: 4,
            w: '90%',
            h: 0.5,
            fontSize: 20,
            color: COLORS.textMuted,
            align: 'center'
        })
    }

    // Tagline
    if (data.content?.tagline) {
        slide.addText(data.content.tagline, {
            x: 0.5,
            y: 4.5,
            w: '90%',
            h: 0.4,
            fontSize: 16,
            color: COLORS.primary,
            align: 'center'
        })
    }

    // Presenter info
    if (data.content?.presenter) {
        slide.addText(`${data.content.presenter}\n${data.content.date || ''}`, {
            x: 0.5,
            y: 5,
            w: '90%',
            h: 0.5,
            fontSize: 12,
            color: COLORS.textMuted,
            align: 'center'
        })
    }
}

function generateProblemSlide(slide: any, data: SlideContent) {
    // Section label
    slide.addText('— PROBLEM DEFINITION', {
        x: 0.5,
        y: 0.3,
        w: '90%',
        fontSize: 10,
        color: COLORS.primary
    })

    // Title
    slide.addText(data.title, {
        x: 0.5,
        y: 0.6,
        w: '90%',
        fontSize: 28,
        bold: true,
        color: COLORS.text
    })

    // Subtitle
    if (data.subtitle) {
        slide.addText(data.subtitle, {
            x: 0.5,
            y: 1.1,
            w: '90%',
            fontSize: 14,
            color: COLORS.textMuted
        })
    }

    // Issues
    const issues = data.content?.issues || []
    const issueColors = [COLORS.danger, COLORS.warning, COLORS.info]

    issues.forEach((issue: any, i: number) => {
        const x = 0.5 + (i * 3.1)
        // Issue card
        slide.addShape('rect', {
            x,
            y: 1.6,
            w: 2.9,
            h: 1.8,
            fill: { color: COLORS.backgroundLight },
            line: { color: issueColors[i] || COLORS.primary, width: 1 },
            rounding: true
        })

        // Issue number
        slide.addText(`ISSUE #${i + 1}`, {
            x: x + 0.2,
            y: 1.7,
            fontSize: 8,
            color: COLORS.textMuted
        })

        // Icon
        slide.addText(issue.icon || '📌', {
            x: x + 0.2,
            y: 2,
            fontSize: 24
        })

        // Title
        slide.addText(issue.title, {
            x: x + 0.2,
            y: 2.5,
            w: 2.5,
            fontSize: 12,
            bold: true,
            color: COLORS.text
        })

        // Description
        slide.addText(issue.desc, {
            x: x + 0.2,
            y: 2.9,
            w: 2.5,
            fontSize: 9,
            color: COLORS.textMuted
        })
    })

    // Target Customer
    if (data.content?.targetCustomer) {
        slide.addShape('rect', {
            x: 0.5,
            y: 3.7,
            w: 4.4,
            h: 0.9,
            fill: { color: COLORS.backgroundLight },
            rounding: true
        })
        slide.addText('TARGET CUSTOMER (ICP)', {
            x: 0.7,
            y: 3.8,
            fontSize: 8,
            color: COLORS.textMuted
        })
        slide.addText(data.content.targetCustomer, {
            x: 0.7,
            y: 4.1,
            w: 4,
            fontSize: 11,
            color: COLORS.text
        })
    }

    // Opportunity
    if (data.content?.opportunity) {
        slide.addShape('rect', {
            x: 5.1,
            y: 3.7,
            w: 4.4,
            h: 0.9,
            fill: { color: COLORS.backgroundLight },
            rounding: true
        })
        slide.addText('MARKET OPPORTUNITY', {
            x: 5.3,
            y: 3.8,
            fontSize: 8,
            color: COLORS.textMuted
        })
        slide.addText(data.content.opportunity, {
            x: 5.3,
            y: 4.1,
            w: 4,
            fontSize: 11,
            color: COLORS.text
        })
    }
}

function generateSolutionSlide(slide: any, data: SlideContent) {
    slide.addText('— SOLUTION OVERVIEW', {
        x: 0.5,
        y: 0.3,
        fontSize: 10,
        color: COLORS.primary
    })

    slide.addText(data.subtitle || data.title, {
        x: 0.5,
        y: 0.6,
        w: '90%',
        fontSize: 28,
        bold: true,
        color: COLORS.text
    })

    if (data.content?.mainDesc) {
        slide.addText(data.content.mainDesc, {
            x: 0.5,
            y: 1.2,
            w: '90%',
            fontSize: 14,
            color: COLORS.textMuted
        })
    }

    // Features
    const features = data.content?.features || []
    features.forEach((feature: any, i: number) => {
        const x = 0.5 + (i * 3.1)

        slide.addShape('rect', {
            x,
            y: 2,
            w: 2.9,
            h: 2.2,
            fill: { color: COLORS.backgroundLight },
            rounding: true
        })

        slide.addText(feature.icon || '⚡', {
            x: x + 1.1,
            y: 2.3,
            fontSize: 32,
            align: 'center'
        })

        slide.addText(feature.title, {
            x,
            y: 3,
            w: 2.9,
            fontSize: 14,
            bold: true,
            color: COLORS.text,
            align: 'center'
        })

        slide.addText(feature.desc, {
            x: x + 0.2,
            y: 3.4,
            w: 2.5,
            fontSize: 10,
            color: COLORS.textMuted,
            align: 'center'
        })
    })
}

function generateMarketSlide(slide: any, data: SlideContent) {
    slide.addText('— MARKET OPPORTUNITY', {
        x: 0.5,
        y: 0.3,
        fontSize: 10,
        color: COLORS.primary
    })

    slide.addText(`${data.title} ${data.subtitle || ''}`, {
        x: 0.5,
        y: 0.6,
        w: '90%',
        fontSize: 28,
        bold: true,
        color: COLORS.text
    })

    // TAM/SAM/SOM bars
    const markets = [
        { ...data.content?.tam, color: COLORS.secondary, height: 2.5 },
        { ...data.content?.sam, color: COLORS.success, height: 1.8 },
        { ...data.content?.som, color: COLORS.primary, height: 1.2 }
    ]

    markets.forEach((market, i) => {
        const x = 2 + (i * 2.5)
        const y = 4.2 - market.height

        // Bar
        slide.addShape('rect', {
            x,
            y,
            w: 2,
            h: market.height,
            fill: { color: market.color },
            rounding: true
        })

        // Value
        slide.addText(market.value || '', {
            x,
            y: y + 0.3,
            w: 2,
            fontSize: 18,
            bold: true,
            color: COLORS.text,
            align: 'center'
        })

        // Label
        slide.addText(market.label || '', {
            x,
            y: 4.3,
            w: 2,
            fontSize: 8,
            color: COLORS.textMuted,
            align: 'center'
        })

        // Description
        slide.addText(market.desc || '', {
            x,
            y: 4.5,
            w: 2,
            fontSize: 8,
            color: COLORS.textMuted,
            align: 'center'
        })
    })

    // CAGR
    if (data.content?.cagr) {
        slide.addShape('rect', {
            x: 3.5,
            y: 5,
            w: 3,
            h: 0.4,
            fill: { color: COLORS.success + '33' },
            rounding: true
        })
        slide.addText(data.content.cagr, {
            x: 3.5,
            y: 5.05,
            w: 3,
            fontSize: 12,
            color: COLORS.success,
            align: 'center'
        })
    }
}

function generateBusinessModelSlide(slide: any, data: SlideContent) {
    slide.addText('— BUSINESS MODEL', {
        x: 0.5,
        y: 0.3,
        fontSize: 10,
        color: COLORS.primary
    })

    slide.addText(data.title, {
        x: 0.5,
        y: 0.6,
        w: '90%',
        fontSize: 28,
        bold: true,
        color: COLORS.text
    })

    slide.addText(data.content?.model || '', {
        x: 0.5,
        y: 1.1,
        w: '90%',
        fontSize: 14,
        color: COLORS.textMuted
    })

    // Pricing tiers
    const pricing = data.content?.pricing || []
    pricing.forEach((tier: any, i: number) => {
        const x = 0.5 + (i * 3.1)
        const isHighlighted = i === 1

        slide.addShape('rect', {
            x,
            y: 1.6,
            w: 2.9,
            h: 2.2,
            fill: { color: isHighlighted ? COLORS.primary + '22' : COLORS.backgroundLight },
            line: { color: isHighlighted ? COLORS.primary : COLORS.backgroundLight, width: 1 },
            rounding: true
        })

        slide.addText(tier.tier, {
            x,
            y: 1.8,
            w: 2.9,
            fontSize: 14,
            bold: true,
            color: COLORS.text,
            align: 'center'
        })

        slide.addText(tier.price, {
            x,
            y: 2.2,
            w: 2.9,
            fontSize: 18,
            bold: true,
            color: COLORS.primary,
            align: 'center'
        })

        // Features
        const features = tier.features || []
        features.forEach((f: string, j: number) => {
            slide.addText(`✓ ${f}`, {
                x: x + 0.3,
                y: 2.7 + (j * 0.3),
                fontSize: 10,
                color: COLORS.textMuted
            })
        })
    })

    // Metrics
    const metrics = data.content?.metrics || {}
    const metricEntries = Object.entries(metrics)
    metricEntries.forEach(([key, value], i) => {
        const x = 0.5 + (i * 3.1)

        slide.addShape('rect', {
            x,
            y: 4,
            w: 2.9,
            h: 0.7,
            fill: { color: COLORS.backgroundLight },
            rounding: true
        })

        slide.addText(key.toUpperCase(), {
            x,
            y: 4.1,
            w: 2.9,
            fontSize: 8,
            color: COLORS.textMuted,
            align: 'center'
        })

        slide.addText(value as string, {
            x,
            y: 4.3,
            w: 2.9,
            fontSize: 14,
            bold: true,
            color: COLORS.text,
            align: 'center'
        })
    })
}

// Default slide generators for other types
function generateProductSlide(slide: any, data: SlideContent) {
    generateDefaultSlide(slide, data, 'PRODUCT / SERVICE')
}

function generateCompetitionSlide(slide: any, data: SlideContent) {
    generateDefaultSlide(slide, data, 'COMPETITIVE ANALYSIS')
}

function generateGTMSlide(slide: any, data: SlideContent) {
    generateDefaultSlide(slide, data, 'GO-TO-MARKET STRATEGY')
}

function generateMarketingSlide(slide: any, data: SlideContent) {
    generateDefaultSlide(slide, data, 'MARKETING STRATEGY')
}

function generateTeamSlide(slide: any, data: SlideContent) {
    slide.addText('— TEAM', {
        x: 0.5,
        y: 0.3,
        fontSize: 10,
        color: COLORS.primary
    })

    slide.addText(data.title, {
        x: 0.5,
        y: 0.6,
        w: '90%',
        fontSize: 28,
        bold: true,
        color: COLORS.text
    })

    const founders = data.content?.founders || []
    founders.forEach((founder: any, i: number) => {
        const x = 0.5 + (i * 3.1)

        // Avatar placeholder
        slide.addShape('ellipse', {
            x: x + 0.9,
            y: 1.5,
            w: 1.1,
            h: 1.1,
            fill: { color: COLORS.primary }
        })

        slide.addText(founder.name || '', {
            x,
            y: 2.8,
            w: 2.9,
            fontSize: 14,
            bold: true,
            color: COLORS.text,
            align: 'center'
        })

        slide.addText(founder.role || '', {
            x,
            y: 3.2,
            w: 2.9,
            fontSize: 10,
            color: COLORS.primary,
            align: 'center'
        })

        slide.addText(founder.background || '', {
            x,
            y: 3.5,
            w: 2.9,
            fontSize: 9,
            color: COLORS.textMuted,
            align: 'center'
        })
    })
}

function generateRoadmapSlide(slide: any, data: SlideContent) {
    generateDefaultSlide(slide, data, 'ROADMAP')
}

function generateRevenueSlide(slide: any, data: SlideContent) {
    generateDefaultSlide(slide, data, 'REVENUE PROJECTIONS')
}

function generateFinancialsSlide(slide: any, data: SlideContent) {
    generateDefaultSlide(slide, data, 'FINANCIAL PLAN')
}

function generateInvestmentSlide(slide: any, data: SlideContent) {
    slide.addText('— INVESTMENT ASK', {
        x: 0.5,
        y: 0.3,
        fontSize: 10,
        color: COLORS.primary
    })

    slide.addText(data.title, {
        x: 0.5,
        y: 0.6,
        w: '90%',
        fontSize: 28,
        bold: true,
        color: COLORS.text
    })

    const { round, amount, valuation, terms, progress } = data.content || {}

    // Investment details
    const details = [
        { label: '라운드', value: round },
        { label: '투자금액', value: amount },
        { label: '밸류에이션', value: valuation }
    ].filter(d => d.value)

    details.forEach((detail, i) => {
        const x = 0.5 + (i * 3.1)

        slide.addShape('rect', {
            x,
            y: 1.5,
            w: 2.9,
            h: 1.2,
            fill: { color: COLORS.backgroundLight },
            rounding: true
        })

        slide.addText(detail.label, {
            x,
            y: 1.6,
            w: 2.9,
            fontSize: 10,
            color: COLORS.textMuted,
            align: 'center'
        })

        slide.addText(detail.value, {
            x,
            y: 1.95,
            w: 2.9,
            fontSize: 20,
            bold: true,
            color: COLORS.primary,
            align: 'center'
        })
    })

    if (progress) {
        slide.addText('진행 현황', {
            x: 0.5,
            y: 3,
            fontSize: 12,
            bold: true,
            color: COLORS.text
        })
        slide.addText(progress, {
            x: 0.5,
            y: 3.4,
            w: '90%',
            fontSize: 11,
            color: COLORS.textMuted
        })
    }
}

function generateContactSlide(slide: any, data: SlideContent) {
    slide.addText('Thank You', {
        x: 0.5,
        y: 1.5,
        w: '90%',
        fontSize: 44,
        bold: true,
        color: COLORS.text,
        align: 'center'
    })

    const { name, title: contactTitle, email, phone, website } = data.content || {}

    const contactInfo = [
        name && contactTitle ? `${name} | ${contactTitle}` : name || '',
        email ? `📧 ${email}` : '',
        phone ? `📞 ${phone}` : '',
        website ? `🌐 ${website}` : ''
    ].filter(Boolean)

    slide.addText(contactInfo.join('\n'), {
        x: 0.5,
        y: 2.5,
        w: '90%',
        fontSize: 14,
        color: COLORS.textMuted,
        align: 'center',
        lineSpacing: 28
    })
}

function generateDefaultSlide(slide: any, data: SlideContent, label?: string) {
    slide.addText(`— ${label || data.type.toUpperCase()}`, {
        x: 0.5,
        y: 0.3,
        fontSize: 10,
        color: COLORS.primary
    })

    slide.addText(data.title, {
        x: 0.5,
        y: 0.6,
        w: '90%',
        fontSize: 28,
        bold: true,
        color: COLORS.text
    })

    if (data.subtitle) {
        slide.addText(data.subtitle, {
            x: 0.5,
            y: 1.1,
            w: '90%',
            fontSize: 14,
            color: COLORS.textMuted
        })
    }

    // Display content as JSON for unimplemented types
    if (data.content && Object.keys(data.content).length > 0) {
        const contentText = Object.entries(data.content)
            .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
            .join('\n')

        slide.addText(contentText, {
            x: 0.5,
            y: 1.8,
            w: '90%',
            h: 3,
            fontSize: 10,
            color: COLORS.textMuted,
            valign: 'top'
        })
    }
}

export function downloadPPTX(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
