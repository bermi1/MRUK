'use client';
import { MobileDrawer } from '../MobileDrawer';
import type { MobileMenuProps } from '../shared';

/** Mr UK phone drawer: bright white panel, rounded category rows, navy Pay Later card (see .dr-mruk). */
export function MrukMobileMenu(props: MobileMenuProps) {
  return <MobileDrawer {...props} />;
}
