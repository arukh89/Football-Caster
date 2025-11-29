// Match Simulation Engine
// Realistic football match simulation with events, commentary, and statistics

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
export type MatchEvent = 
  | 'kickoff' 
  | 'goal' 
  | 'shot' 
  | 'save' 
  | 'corner' 
  | 'freekick' 
  | 'penalty' 
  | 'yellow_card' 
  | 'red_card' 
  | 'substitution' 
  | 'injury' 
  | 'offside' 
  | 'foul' 
  | 'half_time' 
  | 'full_time';

export interface PlayerInMatch {
  id: string;
  name: string;
  position: string;
  rating: number;
  stamina: number;
  morale: number;
  attributes: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
}

export interface TeamInMatch {
  name: string;
  formation: string;
  lineup: PlayerInMatch[];
  tactics: MatchTactics;
  chemistry: number;
}

export interface MatchTactics {
  mentality: 'ultra-defensive' | 'defensive' | 'balanced' | 'attacking' | 'ultra-attacking';
  width: 'narrow' | 'normal' | 'wide';
  tempo: 'slow' | 'normal' | 'fast';
  pressing: 'low' | 'medium' | 'high';
}

export interface MatchState {
  minute: number;
  homeScore: number;
  awayScore: number;
  homeTeam: TeamInMatch;
  awayTeam: TeamInMatch;
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  weather: WeatherCondition;
  isPlaying: boolean;
  events: MatchEventData[];
}

export interface MatchEventData {
  type: MatchEvent;
  minute: number;
  team: 'home' | 'away';
  player?: string;
  description: string;
  commentary: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
}

export class MatchSimulator {
  private state: MatchState;
  private eventCallbacks: ((event: MatchEventData) => void)[] = [];
  private stateCallbacks: ((state: MatchState) => void)[] = [];

  constructor(homeTeam: TeamInMatch, awayTeam: TeamInMatch, weather?: WeatherCondition) {
    this.state = {
      minute: 0,
      homeScore: 0,
      awayScore: 0,
      homeTeam,
      awayTeam,
      possession: { home: 50, away: 50 },
      shots: { home: 0, away: 0 },
      shotsOnTarget: { home: 0, away: 0 },
      corners: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      yellowCards: { home: 0, away: 0 },
      redCards: { home: 0, away: 0 },
      weather: weather || this.generateWeather(),
      isPlaying: false,
      events: [],
    };
  }

  onEvent(callback: (event: MatchEventData) => void): void {
    this.eventCallbacks.push(callback);
  }

  onStateChange(callback: (state: MatchState) => void): void {
    this.stateCallbacks.push(callback);
  }

  getState(): MatchState {
    return { ...this.state };
  }

  start(): void {
    this.state.isPlaying = true;
    this.addEvent({
      type: 'kickoff',
      minute: 0,
      team: 'home',
      description: 'Match kicks off!',
      commentary: this.generateCommentary('kickoff', 'home'),
      significance: 'medium',
    });
    this.notifyStateChange();
  }

  simulateMinute(): void {
    if (!this.state.isPlaying || this.state.minute >= 90) return;

    this.state.minute++;
    
    // Update stamina
    this.updateStamina();

    // Calculate possession based on tactics and player attributes
    this.updatePossession();

    // Random events based on tactics and attributes
    this.processRandomEvents();

    // Half-time
    if (this.state.minute === 45) {
      this.addEvent({
        type: 'half_time',
        minute: 45,
        team: 'home',
        description: 'Half-time',
        commentary: this.generateHalfTimeCommentary(),
        significance: 'high',
      });
    }

    // Full-time
    if (this.state.minute === 90) {
      this.state.isPlaying = false;
      this.addEvent({
        type: 'full_time',
        minute: 90,
        team: 'home',
        description: 'Full-time',
        commentary: this.generateFullTimeCommentary(),
        significance: 'critical',
      });
    }

    this.notifyStateChange();
  }

  changeTactics(team: 'home' | 'away', tactics: Partial<MatchTactics>): void {
    const teamState = team === 'home' ? this.state.homeTeam : this.state.awayTeam;
    teamState.tactics = { ...teamState.tactics, ...tactics };
    
    this.addEvent({
      type: 'substitution',
      minute: this.state.minute,
      team,
      description: `Tactical change by ${team} team`,
      commentary: `The manager makes a tactical adjustment, switching to a more ${tactics.mentality || 'balanced'} approach.`,
      significance: 'medium',
    });
    
    this.notifyStateChange();
  }

  private updateStamina(): void {
    const weatherFactor = this.getWeatherStaminaImpact();
    const updateTeamStamina = (team: TeamInMatch): void => {
      team.lineup.forEach((player) => {
        const baseDecrease = 1 + (this.state.minute > 60 ? 0.5 : 0);
        player.stamina = Math.max(0, player.stamina - baseDecrease * weatherFactor);
      });
    };

    updateTeamStamina(this.state.homeTeam);
    updateTeamStamina(this.state.awayTeam);
  }

  private updatePossession(): void {
    const homeStrength = this.calculateTeamStrength('home');
    const awayStrength = this.calculateTeamStrength('away');
    
    const total = homeStrength + awayStrength;
    const homePossession = Math.round((homeStrength / total) * 100);
    
    this.state.possession = {
      home: Math.max(20, Math.min(80, homePossession)),
      away: Math.max(20, Math.min(80, 100 - homePossession)),
    };
  }

  private processRandomEvents(): void {
    const rand = Math.random();
    const homeStrength = this.calculateTeamStrength('home');
    const awayStrength = this.calculateTeamStrength('away');
    
    const homeChance = homeStrength / (homeStrength + awayStrength);

    // Goal chance (about 3-4 per match on average)
    if (rand < 0.04) {
      const scoringTeam = Math.random() < homeChance ? 'home' : 'away';
      this.processGoal(scoringTeam);
    }
    // Shot chance
    else if (rand < 0.15) {
      const shootingTeam = Math.random() < homeChance ? 'home' : 'away';
      this.processShot(shootingTeam);
    }
    // Corner chance
    else if (rand < 0.25) {
      const cornerTeam = Math.random() < homeChance ? 'home' : 'away';
      this.processCorner(cornerTeam);
    }
    // Foul chance
    else if (rand < 0.35) {
      const foulingTeam = Math.random() < 0.5 ? 'home' : 'away';
      this.processFoul(foulingTeam);
    }
  }

  private processGoal(team: 'home' | 'away'): void {
    if (team === 'home') {
      this.state.homeScore++;
    } else {
      this.state.awayScore++;
    }

    const scorer = this.getRandomAttacker(team);
    this.state.shots[team]++;
    this.state.shotsOnTarget[team]++;

    this.addEvent({
      type: 'goal',
      minute: this.state.minute,
      team,
      player: scorer.name,
      description: `GOAL! ${scorer.name} scores for ${team}!`,
      commentary: this.generateCommentary('goal', team, scorer.name),
      significance: 'critical',
    });
  }

  private processShot(team: 'home' | 'away'): void {
    this.state.shots[team]++;
    
    const shooter = this.getRandomAttacker(team);
    const onTarget = Math.random() < 0.4;
    
    if (onTarget) {
      this.state.shotsOnTarget[team]++;
      this.addEvent({
        type: 'save',
        minute: this.state.minute,
        team,
        player: shooter.name,
        description: `${shooter.name} forces a save!`,
        commentary: this.generateCommentary('save', team, shooter.name),
        significance: 'medium',
      });
    } else {
      this.addEvent({
        type: 'shot',
        minute: this.state.minute,
        team,
        player: shooter.name,
        description: `${shooter.name} takes a shot`,
        commentary: this.generateCommentary('shot', team, shooter.name),
        significance: 'low',
      });
    }
  }

  private processCorner(team: 'home' | 'away'): void {
    this.state.corners[team]++;
    this.addEvent({
      type: 'corner',
      minute: this.state.minute,
      team,
      description: `Corner for ${team}`,
      commentary: this.generateCommentary('corner', team),
      significance: 'low',
    });
  }

  private processFoul(team: 'home' | 'away'): void {
    this.state.fouls[team]++;
    const player = this.getRandomPlayer(team);
    
    // 20% chance of yellow card
    if (Math.random() < 0.2) {
      this.state.yellowCards[team]++;
      this.addEvent({
        type: 'yellow_card',
        minute: this.state.minute,
        team,
        player: player.name,
        description: `Yellow card for ${player.name}`,
        commentary: this.generateCommentary('yellow_card', team, player.name),
        significance: 'medium',
      });
    } else {
      this.addEvent({
        type: 'foul',
        minute: this.state.minute,
        team,
        player: player.name,
        description: `Foul by ${player.name}`,
        commentary: this.generateCommentary('foul', team, player.name),
        significance: 'low',
      });
    }
  }

  private calculateTeamStrength(team: 'home' | 'away'): number {
    const teamData = team === 'home' ? this.state.homeTeam : this.state.awayTeam;
    
    // Base strength from player ratings and stamina
    const avgRating = teamData.lineup.reduce((sum, p) => sum + p.rating, 0) / teamData.lineup.length;
    const avgStamina = teamData.lineup.reduce((sum, p) => sum + p.stamina, 0) / teamData.lineup.length;
    
    // Tactics modifier
    const tacticsModifier = this.getTacticsModifier(teamData.tactics);
    
    // Weather impact
    const weatherModifier = this.getWeatherImpact(teamData);
    
    // Chemistry bonus
    const chemistryBonus = teamData.chemistry / 100;
    
    return avgRating * (avgStamina / 100) * tacticsModifier * weatherModifier * (1 + chemistryBonus * 0.2);
  }

  private getTacticsModifier(tactics: MatchTactics): number {
    let modifier = 1.0;
    
    // Mentality impact
    switch (tactics.mentality) {
      case 'ultra-attacking':
        modifier *= 1.3;
        break;
      case 'attacking':
        modifier *= 1.15;
        break;
      case 'defensive':
        modifier *= 0.9;
        break;
      case 'ultra-defensive':
        modifier *= 0.8;
        break;
    }
    
    // Tempo impact
    if (tactics.tempo === 'fast') modifier *= 1.1;
    if (tactics.tempo === 'slow') modifier *= 0.95;
    
    return modifier;
  }

  private getWeatherImpact(team: TeamInMatch): number {
    const weather = this.state.weather;
    let modifier = 1.0;
    
    if (weather === 'rainy') {
      // Rainy weather reduces pace-based play
      const avgPace = team.lineup.reduce((sum, p) => sum + p.attributes.pace, 0) / team.lineup.length;
      modifier = 1 - (avgPace / 100) * 0.1;
    } else if (weather === 'windy') {
      // Windy weather affects passing
      const avgPassing = team.lineup.reduce((sum, p) => sum + p.attributes.passing, 0) / team.lineup.length;
      modifier = 1 - (avgPassing / 100) * 0.08;
    } else if (weather === 'snowy') {
      // Snow significantly reduces pace
      modifier = 0.85;
    }
    
    return modifier;
  }

  private getWeatherStaminaImpact(): number {
    switch (this.state.weather) {
      case 'rainy': return 1.1;
      case 'snowy': return 1.2;
      case 'sunny': return 1.05;
      default: return 1.0;
    }
  }

  private generateWeather(): WeatherCondition {
    const rand = Math.random();
    if (rand < 0.5) return 'sunny';
    if (rand < 0.75) return 'cloudy';
    if (rand < 0.9) return 'rainy';
    if (rand < 0.95) return 'windy';
    return 'snowy';
  }

  private getRandomPlayer(team: 'home' | 'away'): PlayerInMatch {
    const lineup = team === 'home' ? this.state.homeTeam.lineup : this.state.awayTeam.lineup;
    return lineup[Math.floor(Math.random() * lineup.length)];
  }

  private getRandomAttacker(team: 'home' | 'away'): PlayerInMatch {
    const lineup = team === 'home' ? this.state.homeTeam.lineup : this.state.awayTeam.lineup;
    const attackers = lineup.filter((p) => p.position === 'FWD' || p.position === 'MID');
    return attackers.length > 0 
      ? attackers[Math.floor(Math.random() * attackers.length)]
      : this.getRandomPlayer(team);
  }

  private generateCommentary(eventType: MatchEvent, team: 'home' | 'away', player?: string): string {
    const weather = this.state.weather;
    const minute = this.state.minute;
    
    const templates: Record<MatchEvent, string[]> = {
      kickoff: [
        `And we're underway! ${weather === 'rainy' ? 'The rain is pouring down as' : ''} The match begins!`,
        `The referee blows the whistle! ${weather === 'windy' ? 'Strong winds may play a factor today.' : ''}`,
        `We're off! ${weather === 'sunny' ? 'Perfect conditions for football!' : 'Challenging weather conditions today.'}`,
      ],
      goal: [
        `GOOOAL! ${player} finds the back of the net! What a finish!`,
        `It's in! ${player} scores! ${weather === 'rainy' ? 'A stunning goal in difficult conditions!' : 'Brilliant!'}`,
        `${player} strikes! The keeper had no chance! ${minute > 85 ? 'A crucial late goal!' : ''}`,
      ],
      shot: [
        `${player} goes for goal... ${weather === 'windy' ? 'but the wind takes it wide!' : 'just wide!'}`,
        `A shot from ${player}! ${weather === 'rainy' ? 'Slips on the wet surface' : 'Not quite on target'}`,
        `${player} tries his luck from distance...`,
      ],
      save: [
        `Great save! The keeper denies ${player}!`,
        `${player} forces a brilliant save! ${weather === 'rainy' ? 'The keeper did well to hold onto that in the wet!' : ''}`,
        `Close! ${player}'s effort is saved!`,
      ],
      corner: [
        `Corner kick awarded. ${weather === 'windy' ? 'This could be tricky to defend with the wind.' : ''}`,
        `A corner for the ${team} side. ${minute > 80 ? 'Late pressure building!' : ''}`,
        `They'll take the corner... ${weather === 'rainy' ? 'Keeper will want to come for this despite the conditions.' : ''}`,
      ],
      freekick: [
        `Free kick in a dangerous position...`,
        `The referee awards a free kick. ${weather === 'windy' ? 'The wind could be a factor here.' : ''}`,
      ],
      penalty: [
        `PENALTY! The referee points to the spot!`,
      ],
      yellow_card: [
        `${player} goes into the book. That's a yellow card.`,
        `The referee shows ${player} a yellow card for that challenge.`,
      ],
      red_card: [
        `RED CARD! ${player} is sent off!`,
      ],
      substitution: [
        `We're seeing a substitution...`,
      ],
      injury: [
        `The physio is on... ${player} needs treatment.`,
      ],
      offside: [
        `The flag is up! Offside called.`,
      ],
      foul: [
        `Foul by ${player}. ${weather === 'rainy' ? 'Hard to stay on your feet in these conditions.' : ''}`,
        `${player} commits a foul.`,
      ],
      half_time: [
        `That's half-time! ${weather !== 'sunny' ? 'Both teams will be glad to get into the dressing room.' : ''}`,
      ],
      full_time: [
        `The final whistle blows! That's full-time!`,
      ],
    };

    const options = templates[eventType] || ['Event occurred.'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateHalfTimeCommentary(): string {
    const homeScore = this.state.homeScore;
    const awayScore = this.state.awayScore;
    const homePoss = this.state.possession.home;
    
    if (homeScore === awayScore) {
      return `It's level at the break! ${homePoss > 60 ? 'The home side has dominated possession but couldn\'t convert it to goals.' : 'An evenly matched first half!'}`;
    } else if (homeScore > awayScore) {
      return `The home side leads at half-time! ${homePoss < 40 ? 'Clinical finishing against the run of play!' : 'They\'ve been the better team and the scoreline reflects that.'}`;
    } else {
      return `The away team is ahead at the break! ${homePoss > 60 ? 'Impressive counter-attacking football!' : 'They\'ve controlled the game so far.'}`;
    }
  }

  private generateFullTimeCommentary(): string {
    const homeScore = this.state.homeScore;
    const awayScore = this.state.awayScore;
    
    if (homeScore === awayScore) {
      return `A fair result! Both teams can be satisfied with a point.`;
    } else if (homeScore > awayScore) {
      return `Victory for the home side! Final score ${homeScore}-${awayScore}. ${homeScore - awayScore > 2 ? 'A dominant performance!' : 'A hard-fought win!'}`;
    } else {
      return `The away team takes all three points! Final score ${homeScore}-${awayScore}. ${awayScore - homeScore > 2 ? 'An impressive away victory!' : 'A crucial win!'}`;
    }
  }

  private addEvent(event: MatchEventData): void {
    this.state.events.push(event);
    this.eventCallbacks.forEach((cb) => cb(event));
  }

  private notifyStateChange(): void {
    this.stateCallbacks.forEach((cb) => cb(this.getState()));
  }
}
