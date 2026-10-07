export const customerApprovedStatus='Customer approved — awaiting confirmation';
export const enquiryStatusSql=(alias='')=>`CASE WHEN ${alias}status='In progress' AND ${alias}customer_approved_at IS NOT NULL THEN '${customerApprovedStatus}' ELSE ${alias}status END`;

export const displayEnquiryStatus=(row:Record<string,unknown>)=>row.status==='In progress'&&row.customer_approved_at?customerApprovedStatus:row.status;
