import styled from 'styled-components';
import { vars } from '../../theme/theme.js';

export const TableWrap = styled.div`
  background: var(--color-white);
  border: 1px solid ${vars.line};
  border-radius: 12px;
  overflow: hidden;
`;

export const Scroll = styled.div`
  position: relative;
  overflow-x: auto;
  min-height: 80px;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const Th = styled.th`
  text-align: ${({ $align }) => $align || 'left'};
  width: ${({ $width }) => $width || 'auto'};
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: ${vars.muted};
  font-weight: 700;
  padding: ${({ $sortable }) => ($sortable ? '0' : '9px 14px')};
  border-bottom: 1px solid ${vars.line};
  background: var(--tone-fafcfd);
`;

export const SortButton = styled.button`
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  cursor: pointer;
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  color: inherit;

  &:hover { color: ${vars.ink}; }
  &:focus-visible { outline: 2px solid ${vars.brand}; outline-offset: -2px; }

  .bi { font-size: 11px; opacity: 0.7; }
`;

export const Tr = styled.tr`
  ${({ $clickable }) => $clickable && `
    cursor: pointer;
    &:hover { background: ${vars.brandLight}; }
  `}

  &:last-child td { border-bottom: none; }
`;

export const Td = styled.td`
  text-align: ${({ $align }) => $align || 'left'};
  padding: 11px 14px;
  border-bottom: 1px solid ${vars.lineSoft};
  font-size: 13px;
`;

export const EmptyCell = styled.td`
  text-align: center;
  color: ${vars.muted};
  padding: 28px 14px;
`;

export const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 18px;
  padding: 10px 14px;
  border-top: 1px solid ${vars.lineSoft};
  font-size: 12.5px;
  color: ${vars.muted};

  b { color: ${vars.ink}; }
`;

export const SizePicker = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  select { padding: 4px 8px; font-size: 12.5px; }
`;

export const Pager = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;

  @media (max-width: 600px) {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }
`;

export const PageButton = styled.button`
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid ${({ $active }) => ($active ? vars.brand : vars.line)};
  border-radius: 7px;
  background: ${({ $active }) => ($active ? vars.brand : 'var(--color-white)')};
  color: ${({ $active }) => ($active ? 'var(--color-white)' : vars.ink)};
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${vars.brand};
    color: ${({ $active }) => ($active ? 'var(--color-white)' : vars.brandDark)};
  }
  &:disabled { opacity: 0.4; cursor: default; }
`;

export const Gap = styled.span`
  padding: 0 4px;
`;
