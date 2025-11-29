'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

export const Tabs = TabsPrimitive.Root;
export const TabsList = TabsPrimitive.List;
export const TabsTrigger = TabsPrimitive.Trigger;
export const TabsContent = TabsPrimitive.Content;

export type TabsProps = React.ComponentProps<typeof Tabs>;
export type TabsListProps = React.ComponentProps<typeof TabsList>;
export type TabsTriggerProps = React.ComponentProps<typeof TabsTrigger>;
export type TabsContentProps = React.ComponentProps<typeof TabsContent>;

export default Tabs;
