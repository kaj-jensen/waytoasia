import {defineField,defineType} from 'sanity';

export const articleType=defineType({
  name:'article',
  title:'Travel story',
  type:'document',
  fields:[
    defineField({name:'title',type:'string',validation:r=>r.required()}),
    defineField({name:'slug',type:'slug',options:{source:'title'},validation:r=>r.required()}),
    defineField({name:'country',type:'reference',to:[{type:'country'}]}),
    defineField({name:'hero',type:'image',options:{hotspot:true},fields:[defineField({name:'alt',type:'string',validation:r=>r.required()})]}),
    defineField({name:'publishedAt',type:'datetime'}),
    defineField({name:'translations',type:'array',of:[{type:'object',fields:[{name:'locale',type:'string'},{name:'title',type:'string'},{name:'standfirst',type:'text'},{name:'body',type:'array',of:[{type:'block'}]}]}]})
  ]
});
