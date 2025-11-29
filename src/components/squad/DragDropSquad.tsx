'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { GlassCard } from '@/components/glass/GlassCard';
import { Badge } from '@/components/ui/badge';
import type { Player } from '@/lib/types';

interface DragDropSquadProps {
  lineup: Player[];
  subs: Player[];
  onLineupChange: (lineup: Player[], subs: Player[]) => void;
}

export function DragDropSquad({ lineup, subs, onLineupChange }: DragDropSquadProps): JSX.Element {
  const [localLineup, setLocalLineup] = useState<Player[]>(lineup);
  const [localSubs, setLocalSubs] = useState<Player[]>(subs);

  const handleDragEnd = (result: DropResult): void => {
    const { source, destination } = result;

    if (!destination) return;

    const sourceList = source.droppableId === 'lineup' ? localLineup : localSubs;
    const destList = destination.droppableId === 'lineup' ? localLineup : localSubs;

    if (source.droppableId === destination.droppableId) {
      // Same list reorder
      const newList = Array.from(sourceList);
      const [removed] = newList.splice(source.index, 1);
      newList.splice(destination.index, 0, removed);

      if (source.droppableId === 'lineup') {
        setLocalLineup(newList);
        onLineupChange(newList, localSubs);
      } else {
        setLocalSubs(newList);
        onLineupChange(localLineup, newList);
      }
    } else {
      // Different lists
      const sourceClone = Array.from(sourceList);
      const destClone = Array.from(destList);
      const [removed] = sourceClone.splice(source.index, 1);
      destClone.splice(destination.index, 0, removed);

      if (source.droppableId === 'lineup') {
        setLocalLineup(sourceClone);
        setLocalSubs(destClone);
        onLineupChange(sourceClone, destClone);
      } else {
        setLocalSubs(sourceClone);
        setLocalLineup(destClone);
        onLineupChange(destClone, sourceClone);
      }
    }
  };

  const renderPlayer = (player: Player, index: number): JSX.Element => (
    <Draggable key={player.playerId} draggableId={player.playerId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`glass rounded-lg p-3 mb-2 cursor-move transition-all ${
            snapshot.isDragging ? 'opacity-70 shadow-2xl scale-105 rotate-2' : 'hover:scale-[1.02]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
              player.position === 'GK' ? 'bg-yellow-500' :
              player.position === 'DEF' ? 'bg-blue-500' :
              player.position === 'MID' ? 'bg-green-500' :
              'bg-red-500'
            }`}>
              {player.position}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">{player.name}</div>
              <div className="text-xs text-muted-foreground">
                Rating: {player.rating} • Morale: {player.morale}
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {player.rating}
            </Badge>
          </div>
        </div>
      )}
    </Draggable>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Starting Lineup */}
        <GlassCard className="championship-card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <span className="text-lg">Starting XI</span>
            <Badge variant="default">{localLineup.length}</Badge>
          </h3>
          <Droppable droppableId="lineup">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`min-h-[400px] p-2 rounded-lg transition-colors ${
                  snapshot.isDraggingOver ? 'bg-emerald-500/10 ring-2 ring-emerald-500' : ''
                }`}
              >
                {localLineup.map((player, index) => renderPlayer(player, index))}
                {provided.placeholder}
                {localLineup.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <p>Drag players here</p>
                    <p className="text-xs mt-2">Starting lineup must have 11 players</p>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </GlassCard>

        {/* Substitutes */}
        <GlassCard className="championship-card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <span className="text-lg">Substitutes</span>
            <Badge variant="secondary">{localSubs.length}</Badge>
          </h3>
          <Droppable droppableId="subs">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`min-h-[400px] p-2 rounded-lg transition-colors ${
                  snapshot.isDraggingOver ? 'bg-blue-500/10 ring-2 ring-blue-500' : ''
                }`}
              >
                {localSubs.map((player, index) => renderPlayer(player, index))}
                {provided.placeholder}
                {localSubs.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <p>No substitutes</p>
                    <p className="text-xs mt-2">Drag extra players here</p>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </GlassCard>
      </div>
    </DragDropContext>
  );
}
