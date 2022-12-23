import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import screenshotUrl from './assets/screenshot-1024.jpg';
import LogoSvg from '../../static/img/logo.svg';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={clsx(styles.heroContainer, "container")}>
        <h1 className="hero__title">
          <LogoSvg width={50} height={50} />
          {siteConfig.title}
        </h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="https://visgl.github.io/flowmap.gl/">
            Live Demo
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Docs
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Description will go into a meta tag in <head />">
      <HomepageHeader/>
      <main>
        {/*<HomepageFeatures />*/}

        {/*<section className={styles.intro}>*/}
        <section className="container margin-vert--xl">
          <div className="row">
            <div className="col col--6 padding-bottom--lg">
              <p>

              Flowmap.gl is a flow map drawing layer
              for <Link to={"https://deck.gl"}>deck.gl</Link>.
              It is a JavaScript module which can be used for
                visualizing movement of people (e.g. migration)
              or objects between geographic locations. The layer is rendered in WebGL and can handle large
              numbers of flows with a relatively good rendering performance.
              </p>

              <p>
                Try <Link to={"https://flowmap.blue"}>FlowmapBlue</Link> for an easy way of publishing a flow map backed by a Google Sheets spreadsheet (no programming skills required).
              </p>
            </div>
            <div className="col col--6">
              <Link to={"https://visgl.github.io/flowmap.gl/"}>
                <img src={screenshotUrl} alt="Flowmap.gl example"/>
              </Link>
            </div>
          </div>
        </section>
        {/*</section>*/}

      </main>
    </Layout>
  );
}
