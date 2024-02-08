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
      <div className={clsx(styles.heroContainer, 'container')}>
        <h1 className="hero__title">
          <LogoSvg width={50} height={50} />
          {siteConfig.title}
        </h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="https://visgl.github.io/flowmap.gl/"
          >
            Live Demo
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
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
      description="Description will go into a meta tag in <head />"
    >
      <HomepageHeader />
      <main>
        {/*<HomepageFeatures />*/}

        {/*<section className={styles.intro}>*/}
        <section className="container margin-vert--xl">
          <div className="row">
            <div className="col col--6 padding-bottom--lg">
              <p>
                Flowmap.gl is a flow map drawing layer for{' '}
                <Link to={'https://deck.gl'}>deck.gl</Link>. It is a JavaScript
                module which can be used for visualization of geographic
                movement: mobility, transportation, migration, etc. The layer is
                rendered in a WebGL context and is capable of adaptive
                aggregation and filtering, which allows it to handle relatively
                large numbers of flows.
              </p>

              <p>
                Try <Link to={'https://flowmap.blue'}>FlowmapBlue</Link> and{' '}
                <Link to={'https://flowmap.city'}>Flowmap City</Link> for an
                easy way of publishing flow maps with no coding required.
              </p>

              <p>
                Flowmap.gl belongs to the{' '}
                <Link to={'http://vis.gl/'}>Vis.gl</Link> family.
              </p>

              {/*<h2>Acknowledgements</h2>*/}
              <p>
                The project has been developed and maintained by{' '}
                <Link to={'https://ilya.boyandin.me'}>Ilya Boyandin</Link> (
                <Link to={'https://github.com/teralytics/flowmap.gl'}>
                  originally at Teralytics
                </Link>
                ).
              </p>
              <p>
                Thanks to{' '}
                <Link to={'https://github.com/tehwalris'}>Philippe Voinov</Link>{' '}
                for the help with the first version of{' '}
                <code>FlowLinesLayer</code>, to{' '}
                <Link to={'https://github.com/rokotyan'}>Nikita Rokotyan</Link>{' '}
                for the advice on <code>AnimatedFlowLinesLayer</code>, to{' '}
                <Link to={'https://github.com/pessimistress'}>Xiaoji Chen</Link>{' '}
                for her help with <Link to={'http://deck.gl'}>deck.gl</Link>,
                and to other contributors.
              </p>
            </div>
            <div className="col col--6">
              <Link to={'https://visgl.github.io/flowmap.gl/'}>
                <img src={screenshotUrl} alt="Flowmap.gl example" />
              </Link>
            </div>
          </div>
        </section>
        {/*</section>*/}
      </main>
    </Layout>
  );
}
