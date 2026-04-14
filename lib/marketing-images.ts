/**
 * Marketing rasters — prefer `public/home_assets/*.png` so the site works without Figma MCP.
 * (Figma asset URLs only work in authenticated MCP contexts, not in production.)
 */
export const marketingImages = {
  /** @deprecated Use `/home_assets/img_2.png` from page constants; kept for any stray imports */
  homeHeroLeft: "/home_assets/img_2.png",
  homeHeroRight: "/home_assets/img_3.png",
  homeHeroFigure: "/home_assets/img_3.png",
  mentorsHeroFigure: "/home_assets/img_2.png",
  mentorsHeroLeft: "/mentors_assets/img_2.png",
  mentorsHeroRight: "/mentors_assets/img_3.png",
  joinCommunityHero: "/home_assets/img_11.png",

  trustLogo1: "/home_assets/img_1.png",
  trustLogo2: "/home_assets/img_1.png",
  trustLogo3: "/home_assets/img_1.png",
  trustLogo4: "/home_assets/img_1.png",
  trustLogo5: "/home_assets/img_1.png",
  trustLogo6: "/home_assets/img_1.png",
  trustLogo7: "/home_assets/img_1.png",
  trustLogo8: "/home_assets/img_1.png",
  trustLogo9: "/home_assets/img_1.png",

  /** “Building the Future of Architecture” — graduation cap + book (bento top-left) */
  featureBuilding: "/home_assets/img_4.png",
  /** “A Community of Designers” — hub + network avatars (bento top-middle) */
  featureCommunity: "/home_assets/img_5.png",
  /** “Mentorship that Matters” — three collaborators at laptop, tall right bento card */
  featureMentorship: "/home_assets/img_7.png",
  /** “Learning Beyond the Studio” — presenter + students + bar chart illustration (bento bottom span) */
  featureStudio: "/home_assets/img_6.png",
  /** Why Us — staircase “lift as you climb” center illustration */
  whyUsCenter: "/home_assets/img_8.png",

  stepsIllustration: "/home_assets/steps.png",
  ctaIllustration: "/home_assets/img_9.png",
  mentorPortrait: "/home_assets/mentor_1.png",
  /** Contact page side art — architects / professionals vector */
  contactFormArt: "/home_assets/img_9.png",

  avatar1: "/home_assets/student_1.png",
  avatar2: "/home_assets/student_2.png",
  avatar3: "/home_assets/student_3.png",
  avatar4: "/home_assets/student_4.png",
  avatar5: "/home_assets/student_1.png",

  testimonialStar: "/home_assets/img_1.png",
  mentorSpotlight: "/home_assets/mentor_1.png",
  /** “What Mentors Say” dark stat card — three people at laptop (matches Figma 44:353) */
  mentorsStatCardPhoto: "/home_assets/img_10.png",
  figmaMentorAvatarEllipse: "/home_assets/mentor_1.png",
} as const;
