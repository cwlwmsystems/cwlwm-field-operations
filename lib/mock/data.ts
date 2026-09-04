export const demoOrganization = { id: "org_demo", name: "Northstar Field Services", slug: "northstar" };
export const demoTeams = [
  { id:"team_internal", name:"Internal Sales", type:"internal", reps:6 },
  { id:"team_vendor", name:"Summit Partners", type:"vendor", reps:4 }
];
export const demoTerritories = [
  { id:"terr_north", name:"North District", market:"Central Market", team:"Internal Sales", locations:612 },
  { id:"terr_south", name:"South District", market:"Central Market", team:"Summit Partners", locations:487 }
];
export const demoReps = [
  { id:"rep_1", name:"Morgan Reed", team:"Internal Sales", status:"active" },
  { id:"rep_2", name:"Taylor Brooks", team:"Summit Partners", status:"active" },
  { id:"rep_3", name:"Avery Stone", team:"Internal Sales", status:"active" }
];
export const demoLocations = [
  { id:"loc_1", address:"101 Demo Street", territory:"North District", disposition:"Follow Up" },
  { id:"loc_2", address:"205 Example Avenue", territory:"South District", disposition:"Not Home" },
  { id:"loc_3", address:"88 Sample Road", territory:"North District", disposition:"Interested" }
];
