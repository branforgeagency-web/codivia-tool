import styled, { css, keyframes } from 'styled-components';
import { vars } from '../../theme/theme.js';

/**
 * Spinner with an optional label.
 *
 * <Loader />                          inline spinner
 * <Loader size="lg" label="Saving" /> bigger, with text
 * <Loader fullScreen />               covers the whole viewport
 * <Loader overlay />                  covers the nearest positioned parent (e.g. a table)
 */
export function Loader({ size = 'md', label, fullScreen = false, overlay = false, className }) {
  return <Wrap role="status" aria-live="polite" className={className} $fullScreen={fullScreen} $overlay={overlay}>
    <Spinner aria-hidden="true" $size={size} />
    {label ? <span>{label}</span> : <VisuallyHidden>Loading...</VisuallyHidden>}
  </Wrap>;
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const sizes = {
  sm: { box: 16, border: 2 },
  md: { box: 28, border: 3 },
  lg: { box: 44, border: 4 },
};

const Wrap = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: ${vars.muted};
  font-size: 13px;
  font-weight: 600;

  ${({ $fullScreen }) => $fullScreen && css`
    position: fixed;
    inset: 0;
    z-index: 1000;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.75);
  `}

  ${({ $overlay }) => $overlay && css`
    position: absolute;
    inset: 0;
    z-index: 5;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.65);
  `}
`;

const Spinner = styled.span`
  display: inline-block;
  width: ${({ $size }) => (sizes[$size] || sizes.md).box}px;
  height: ${({ $size }) => (sizes[$size] || sizes.md).box}px;
  border-radius: 50%;
  border: ${({ $size }) => (sizes[$size] || sizes.md).border}px solid ${vars.line};
  border-top-color: ${vars.brand};
  animation: ${spin} 0.75s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2s;
  }
`;

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
