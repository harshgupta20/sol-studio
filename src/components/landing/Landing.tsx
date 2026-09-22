import './landing.css';
import { Starfield } from './Starfield';
import { CustomCursor } from './CustomCursor';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { Marquee } from './Marquee';
import { Bento } from './Bento';
import { Workflow } from './Workflow';
import { PrivacySection } from './PrivacySection';
import { SolanaSection } from './SolanaSection';
import { FinalCTA } from './FinalCTA';
import { Footer } from './Footer';

/**
 * The public marketing landing page. Fully self-contained — imports nothing from
 * the application/workspace tree, so it loads without the editor bundle.
 */
export function Landing() {
  return (
    <div className="landing-root">
      <Starfield />
      <div className="landing-grid" aria-hidden />
      <div className="landing-noise" aria-hidden />
      <CustomCursor />

      <div className="landing-content">
        <Navbar />
        <main>
          <Hero />
          <Marquee />
          <Bento />
          <Workflow />
          <PrivacySection />
          <SolanaSection />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}
