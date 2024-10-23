'use client';

import React from 'react';

export const dateFormat = ({ date }: { date: Date }) =>
  date.toLocaleString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );

export default function RenderDate({ date }: { date: string }) {
  return <span>{dateFormat({ date: new Date(date) })}</span>;
}
