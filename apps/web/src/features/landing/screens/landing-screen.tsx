import { LandingCoda } from '../components/landing-coda';
import { LandingFeatures } from '../components/landing-features';
import { LandingFlow } from '../components/landing-flow';
import { LandingHero } from '../components/landing-hero';
import { LandingPrinciples } from '../components/landing-principles';
export const LandingScreen = (): React.ReactElement => (
  <article>
    <LandingHero />
    <LandingFlow />
    <LandingFeatures />
    <LandingPrinciples />
    <LandingCoda />
  </article>
);
