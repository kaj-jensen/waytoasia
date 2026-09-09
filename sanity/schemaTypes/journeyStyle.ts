import {defineField,defineType} from 'sanity';

export const journeyStyleType=defineType({
  name:'journeyStyle',
  title:'Journey style',
  type:'document',
  fields:[
    defineField({name:'title',type:'string',validation:r=>r.required()}),
    defineField({name:'slug',type:'slug',options:{source:'title'},validation:r=>r.required()}),
    defineField({name:'image',type:'image',options:{hotspot:true},fields:[defineField({name:'alt',type:'string',validation:r=>r.required()})]}),
    defineField({name:'pace',type:'string',options:{list:['Unhurried','Balanced','Immersive','Adventurous']}}),
    defineField({name:'translations',type:'array',of:[{type:'object',fields:[{name:'locale',type:'string'},{name:'title',type:'string'},{name:'eyebrow',type:'string'},{name:'description',type:'text'},{name:'idealFor',type:'string'}]}]})
  ]
});
