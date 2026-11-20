import hero from '@/assets/hero_indian_dairy.jpg.asset.json';
import centre from '@/assets/village_collection_centre.jpg.asset.json';
import cow from '@/assets/gir_cow_portrait.jpg.asset.json';
import buffalo from '@/assets/murrah_buffalo_portrait.jpg.asset.json';
import farmer from '@/assets/farmer_avatar_ramesh.jpg.asset.json';

export const ASSETS = {
  heroDairy: hero.url,
  collectionCentre: centre.url,
  girCow: cow.url,
  murrahBuffalo: buffalo.url,
  farmerRamesh: farmer.url,
};

export const animalFallback = (type: string) => (type === 'Cow' ? ASSETS.girCow : ASSETS.murrahBuffalo);
