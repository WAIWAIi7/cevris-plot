# Additional scientific recipes. All transformations are recorded in export metadata.
tree_segments <- function(hc) {
  nodes<-vector("list",nrow(hc$merge)); seg<-list(); leaf<-match(seq_along(hc$order),hc$order)
  for(i in seq_len(nrow(hc$merge))) {
    child<-lapply(hc$merge[i,],function(k)if(k<0)c(leaf[-k],0) else nodes[[k]])
    a<-child[[1]];b<-child[[2]];height<-hc$height[i]
    seg[[i]]<-data.frame(x=c(a[1],b[1],a[1]),y=c(a[2],b[2],height),xend=c(a[1],b[1],b[1]),yend=height)
    nodes[[i]]<-c(mean(c(a[1],b[1])),height)
  }
  do.call(rbind,seg)
}
research_plot <- function(id, env) {
 e<-new.env(parent=env);e$id<-id
 evalq({
  plot<-NULL;xlab<-"";ylab<-"";analysis<-list();note<-"";axes<-character();fillLabel<-NULL;customTheme<-NULL
  no_axes<-function()theme(axis.line=element_blank(),axis.ticks=element_blank(),axis.text.x=element_blank(),axis.text.y=element_blank(),axis.title.x=element_blank(),axis.title.y=element_blank(),panel.grid=element_blank())
  if(id=="clustered_heatmap") {
    rr<-sort(unique(get("row")));cc<-sort(unique(get("column")));nr<-length(rr);nc<-length(cc)
    mat<-matrix(NA_real_,nr,nc,dimnames=list(rr,cc))
    for(i in seq_len(nrow(d)))mat[get("row")[i],get("column")[i]]<-num("value")[i]
    if(s$normalization=="row_z")mat<-t(scale(t(mat)))
    rh<-hclust(dist(mat),method=s$clusterMethod);ch<-hclust(dist(t(mat)),method=s$clusterMethod)
    mat<-mat[rh$order,ch$order,drop=FALSE]
    q<-expand.grid(row=seq_len(nr),column=seq_len(nc));q$value<-as.vector(mat);q$y<-nr+1-q$row
    rs<-tree_segments(rh);cs<-tree_segments(ch);rx<-max(rh$height,1e-10);cx<-max(ch$height,1e-10)
    rowtree<-data.frame(x=.25-rs$y/rx*nc*s$treeSize,y=nr+1-rs$x,xend=.25-rs$yend/rx*nc*s$treeSize,yend=nr+1-rs$xend)
    coltree<-data.frame(x=cs$x,y=nr+.75+cs$y/cx*nr*s$treeSize,xend=cs$xend,yend=nr+.75+cs$yend/cx*nr*s$treeSize)
    plot<-ggplot(q,aes(column,y,fill=value))+geom_tile(colour=if(s$cellBorder)s$background else NA,linewidth=lw,alpha=alpha)+
      geom_segment(data=rbind(rowtree,coltree),aes(x,y,xend=xend,yend=yend),inherit.aes=FALSE,linewidth=lw,colour=s$fillColor)+
      scale_x_continuous(breaks=seq_len(nc),labels=colnames(mat),expand=expansion(add=.5))+
      scale_y_continuous(breaks=seq_len(nr),labels=rev(rownames(mat)),expand=expansion(add=.5))
    plot<-plot+if(s$normalization=="row_z")scale_fill_gradient2(low=s$colorLow,mid=s$colorMid,high=s$colorHigh,midpoint=0) else scale_fill_gradientn(colours=c(s$colorLow,s$colorMid,s$colorHigh))
    fillLabel<-if(s$normalization=="row_z")"Row z score" else m$value
    customTheme<-theme(axis.line=element_blank(),axis.ticks=element_blank(),panel.grid=element_blank())
    note<-paste0("Euclidean distance / ",s$clusterMethod,"; ",if(s$normalization=="row_z")"Row standardized" else "Original values")
    analysis<-list(kind="hierarchical_heatmap",distance="euclidean",linkage=s$clusterMethod,normalization=s$normalization,rowOrder=rownames(mat),columnOrder=colnames(mat),rowHeights=rh$height,columnHeights=ch$height)
  } else if(id %in% c("dendrogram","scatter_matrix","parallel_coordinates","pca_biplot")) {
    columns<-unlist(m$columns);mat<-as.matrix(data.frame(lapply(d[,columns,drop=FALSE],as.numeric),check.names=FALSE));colnames(mat)<-columns
    if(id=="dendrogram") {
      work<-if(s$scalePca)scale(mat) else mat;hc<-hclust(dist(work),method=s$clusterMethod);segments<-tree_segments(hc)
      plot<-ggplot(segments)+geom_segment(aes(x,y,xend=xend,yend=yend),linewidth=lw,colour=s$fillColor,alpha=alpha)+
        scale_x_continuous(breaks=seq_len(nrow(mat)),labels=get("subject")[hc$order])+scale_y_continuous(expand=expansion(mult=c(0,.08)))
      ylab<-"Merge height (Euclidean distance)";axes<-"y"
      note<-paste0(s$clusterMethod,"; ",if(s$scalePca)"Standardized features" else "Original scale")
      analysis<-list(kind="hierarchical_clustering",distance="euclidean",linkage=s$clusterMethod,scaled=s$scalePca,order=get("subject")[hc$order],heights=hc$height,merge=hc$merge)
    } else if(id=="scatter_matrix") {
      q<-do.call(rbind,lapply(seq_along(columns),function(a)do.call(rbind,lapply(seq_along(columns),function(b){
        if(a==b)return(NULL)
        data.frame(x=mat[,a],y=mat[,b],fx=columns[a],fy=columns[b],group=g)
      }))))
      q$fx<-factor(q$fx,levels=columns);q$fy<-factor(q$fy,levels=columns)
      diag<-data.frame(fx=factor(columns,levels=columns),fy=factor(columns,levels=columns),x=apply(mat,2,function(v)mean(range(v))),y=apply(mat,2,function(v)mean(range(v))),label=columns)
      plot<-ggplot(q,aes(x,y,fill=group,colour=group))+geom_point(shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha)+common_scale(levels(g))+
        geom_text(data=diag,aes(x,y,label=label),inherit.aes=FALSE,family=font,size=s$fontSize/3.5,colour="#315F88")+
        facet_grid(fy~fx,scales="free")
      customTheme<-theme(panel.spacing=grid::unit(s$panelGap,"mm"),strip.background=element_rect(fill="#DFE9F1",colour=NA),strip.text=element_text(size=s$fontSize*.9),axis.text=element_text(size=s$fontSize*.7))
      analysis<-list(kind="scatter_matrix",columns=columns,rows=nrow(mat));note<-"Original units on each axis; one point per sample"
    } else if(id=="parallel_coordinates") {
      scaled<-if(s$parallelScale=="zscore")scale(mat) else apply(mat,2,function(v)(v-min(v))/diff(range(v)))
      q<-do.call(rbind,lapply(seq_along(columns),function(i)data.frame(variable=factor(columns[i],levels=columns),value=scaled[,i],subject=get("subject"),group=g)))
      plot<-ggplot(q,aes(variable,value,group=subject,colour=group))+geom_line(linewidth=lw,alpha=alpha)+scale_colour_manual(values=palette_for(levels(g)))
      if(s$showPoints)plot<-plot+geom_point(size=s$pointSize,alpha=alpha)
      ylab<-if(s$parallelScale=="zscore")"Variable z score" else "Variable position (0-1)";axes<-"y"
      analysis<-list(kind="parallel_coordinates",normalization=s$parallelScale,columns=columns);note<-"Display scaling only; source values are preserved"
    } else {
      pc<-prcomp(mat,center=TRUE,scale.=s$scalePca);variance<-pc$sdev^2/sum(pc$sdev^2)*100
      q<-data.frame(x=pc$x[,1],y=pc$x[,2],group=g);rot<-pc$rotation[,1:2,drop=FALSE]
      factor<-min(vapply(1:2,function(i)max(abs(pc$x[,i]),.1)/max(abs(rot[,i]),1e-10),0))*.7*s$loadingScale
      a<-data.frame(x=rot[,1]*factor,y=rot[,2]*factor,label=columns)
      span<-max(diff(range(q$y)),.5);a$tx<-ifelse(a$x<0,-1,1)*max(abs(q$x))*.5;a$ty<-a$y
      for(side in unique(a$tx)){ii<-which(a$tx==side);ii<-ii[order(a$ty[ii])];if(length(ii)>1)for(j in 2:length(ii))a$ty[ii[j]]<-max(a$ty[ii[j]],a$ty[ii[j-1]]+span*.15)}
      plot<-ggplot(q,aes(x,y,fill=group,colour=group))+geom_hline(yintercept=0,linewidth=lw,colour="#BACBD7")+geom_vline(xintercept=0,linewidth=lw,colour="#BACBD7")+
        geom_point(shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha)+common_scale(levels(g))+
        geom_segment(data=a,aes(x=0,y=0,xend=x,yend=y),inherit.aes=FALSE,linewidth=lw,colour=s$fillColor,arrow=grid::arrow(length=grid::unit(2,"mm")))+
        geom_segment(data=a,aes(x=x,y=y,xend=tx,yend=ty),inherit.aes=FALSE,linewidth=lw,colour="#AABECB")+
        geom_text(data=a,aes(x=tx,y=ty,label=label),hjust=ifelse(a$tx<0,1.05,-.05),inherit.aes=FALSE,family=font,size=s$fontSize/3.2,colour="#315F88")+coord_fixed()
      xlab<-sprintf("PC1 (%.1f%%)",variance[1]);ylab<-sprintf("PC2 (%.1f%%)",variance[2]);axes<-c("x","y")
      note<-sprintf("%s; arrows = rotated loadings x %.3f, not score units",if(s$scalePca)"Centered and scaled" else "Centered only",factor)
      analysis<-list(kind="PCA_biplot",scaled=s$scalePca,variancePercent=variance,arrowFactor=factor,loadings=rot,scores=pc$x[,1:2,drop=FALSE])
    }
  } else if(id=="kaplan_meier") {
    all<-data.frame(time=num("time"),event=num("event"),group=g)
    curves<-list();counts<-list();ticks<-unique(signif(seq(0,max(all$time),length.out=as.integer(s$riskTicks)),2));ticks<-ticks[ticks<=max(all$time)]
    for(k in levels(g)) {
      z<-all[all$group==k,];fit<-survival::survfit(survival::Surv(time,event)~1,data=z,conf.int=.95,conf.type="log-log")
      lo<-fit$lower;hi<-fit$upper;lo[fit$surv==0]<-0;hi[fit$surv==0]<-0;lo[fit$surv==1]<-1;hi[fit$surv==1]<-1
      curves[[k]]<-data.frame(time=c(0,fit$time),surv=c(1,fit$surv),lower=c(1,lo),upper=c(1,hi),risk=c(nrow(z),fit$n.risk),events=c(0,fit$n.event),censor=c(0,fit$n.censor),group=k)
      counts[[k]]<-data.frame(time=ticks,risk=vapply(ticks,function(t)sum(z$time>=t),0L),group=k)
    }
    q<-do.call(rbind,curves);q$group<-factor(q$group,levels=levels(g));risk<-do.call(rbind,counts)
    bands<-do.call(rbind,lapply(curves,function(z){i<-seq_len(nrow(z));out<-z[rep(i,each=2)[-1],];out$lower<-rep(z$lower,each=2)[-length(rep(i,each=2))];out$upper<-rep(z$upper,each=2)[-length(rep(i,each=2))];out}))
    plot<-ggplot(q,aes(time,surv,group=group,colour=group,fill=group))
    if(s$showCI)plot<-plot+geom_ribbon(data=bands,aes(ymin=lower,ymax=upper),colour=NA,alpha=s$bandAlpha,stat="identity")
    plot<-plot+geom_step(linewidth=lw,alpha=alpha,direction="hv")+scale_colour_manual(values=palette_for(levels(g)))+scale_fill_manual(values=palette_for(levels(g)))+
      scale_y_continuous(breaks=seq(0,1,.2),labels=scales::label_percent())+scale_x_continuous(breaks=ticks)+expand_limits(y=c(0,1))
    if(s$showCensor)plot<-plot+geom_point(data=q[q$censor>0,],shape=3,size=s$pointSize,stroke=lw)
    if(s$riskTable) {
      risk$y<--.16-.12*(match(risk$group,levels(g))-1)
      plot<-plot+geom_hline(yintercept=-.07,linewidth=lw,colour="#BCCBD7")+
        geom_text(data=risk,aes(x=time,y=y,label=risk,colour=group),inherit.aes=FALSE,family=font,size=s$fontSize/3.6,show.legend=FALSE)+
        annotate("text",x=0,y=-.09,label="Number at risk (before time)",hjust=0,vjust=0,family=font,size=s$fontSize/3.2,colour="#566D7C")
      # Group labels are on the left of the same rows as their risk counts.
      plot<-plot+scale_y_continuous(breaks=c(seq(0,1,.2),-.16-.12*(seq_along(levels(g))-1)),labels=c(paste0(seq(0,100,20),"%"),levels(g)))
    }
    xlab<-m$time;ylab<-"Survival probability";axes<-"x";note<-"1 = event, 0 = censored; 95% log-log CI; no group test"
    customTheme<-theme(panel.grid=element_blank())
    analysis<-list(kind="Kaplan-Meier",confidence=.95,confidenceMethod="log-log",curves=curves,riskTable=risk[,c("time","risk","group")],n=nrow(all),events=sum(all$event),censored=sum(all$event==0))
  } else if(id=="swimmer") {
    q<-data.frame(subject=get("subject"),time=num("time"),event=factor(ifelse(num("event")==1,"Event","Censored"),levels=c("Event","Censored")),group=g)
    q<-q[order(q$time,decreasing=s$sortDirection=="descending"),];q$pos<-seq_len(nrow(q))
    plot<-ggplot(q,aes(fill=group,colour=group))+geom_rect(aes(xmin=0,xmax=time,ymin=pos-s$width/2,ymax=pos+s$width/2),linewidth=lw,alpha=alpha)+common_scale(levels(g))+
      geom_point(aes(x=time,y=pos,shape=event),colour="#2E2E33",fill=s$background,size=s$pointSize,stroke=lw)+scale_shape_manual(values=c("Event"=23,"Censored"=24),name="Outcome")+
      scale_y_continuous(breaks=q$pos,labels=q$subject)+expand_limits(x=0)
    xlab<-m$time;axes<-"x";note<-"Diamond = event; triangle = right censored"
    analysis<-list(kind="individual_followup",order=q$subject)
  } else if(id=="gantt") {
    q<-data.frame(term=get("term"),start=num("start"),end=num("end"),group=g,pos=rev(seq_len(nrow(d))))
    plot<-ggplot(q,aes(fill=group,colour=group))+geom_rect(aes(xmin=start,xmax=end,ymin=pos-s$width/2,ymax=pos+s$width/2),linewidth=lw,alpha=alpha)+common_scale(levels(g))+scale_y_continuous(breaks=q$pos,labels=q$term)
    if(s$showValues)plot<-plot+geom_text(aes(x=(start+end)/2,y=pos,label=round(end-start,2)),colour="#2E2E33",family=font,size=s$fontSize/3.8)
    xlab<-"Time (input units)";axes<-"x";analysis<-list(kind="time_intervals",duration=q$end-q$start)
  } else if(id=="calendar_heatmap") {
    dates<-as.Date(get("date"));months<-sort(unique(format(seq(min(dates),max(dates),by="day"),"%Y-%m")))
    q<-data.frame(date=seq(as.Date(paste0(months[1],"-01")),as.Date(paste0(tail(months,1),"-01"))+31,by="day"));q<-q[format(q$date,"%Y-%m") %in% months,,drop=FALSE]
    q$month<-factor(format(q$date,"%Y-%m"),levels=months);q$weekday<-(as.POSIXlt(q$date)$wday+6)%%7+1;q$day<-as.integer(format(q$date,"%d"))
    first<-as.Date(paste0(as.character(q$month),"-01"));offset<-(as.POSIXlt(first)$wday+6)%%7;q$week<-floor((q$day-1+offset)/7)
    q$value<-num("value")[match(q$date,dates)]
    plot<-ggplot(q,aes(weekday,-week,fill=value))+geom_tile(colour=if(s$cellBorder)s$background else NA,linewidth=lw,alpha=alpha)+
      scale_fill_gradient(low=s$colorLow,high=s$colorHigh,na.value="#DEE6ED")+
      facet_wrap(~month,ncol=3)+scale_x_continuous(breaks=1:7,labels=c("Mon","Tue","Wed","Thu","Fri","Sat","Sun"))+scale_y_continuous(breaks=NULL)+coord_fixed()
    if(s$showValues)plot<-plot+geom_text(aes(label=ifelse(is.na(value),paste0(day,"\nNA"),paste0(day,"\n",round(value,1)))),family=font,size=s$fontSize/5,colour="#20374A")
    else plot<-plot+geom_text(aes(label=day),family=font,size=s$fontSize/4.3,colour="#20374A")
    fillLabel<-m$value;note<-"Monday to Sunday; gray cells indicate missing observations"
    customTheme<-theme(axis.line=element_blank(),axis.ticks=element_blank(),panel.grid=element_blank(),panel.spacing=grid::unit(s$panelGap,"mm"),strip.background=element_rect(fill="#DFE9F1",colour=NA))
    analysis<-list(kind="calendar",missingDates=as.character(q$date[is.na(q$value)]),weekStarts="Monday")
  } else if(id=="polar_histogram") {
    bins<-as.integer(s$angleBins);angles<-num("angle")%%360;counts<-tabulate(pmin(floor(angles/360*bins)+1,bins),nbins=bins);maxr<-sqrt(max(counts));direction<-if(s$clockwise)1 else -1
    q<-do.call(rbind,lapply(seq_len(bins),function(i){a<-seq((i-1)/bins*2*pi,i/bins*2*pi,length.out=24);radius<-sqrt(counts[i]);data.frame(x=c(0,direction*sin(a)*radius,0),y=c(0,cos(a)*radius,0),bin=i)}))
    ticks<-pretty(c(0,max(counts)));ticks<-ticks[ticks>0 & ticks<=max(counts)];circle<-do.call(rbind,lapply(ticks,function(v){a<-seq(0,2*pi,length.out=180);data.frame(x=sin(a)*sqrt(v),y=cos(a)*sqrt(v),value=v)}))
    plot<-ggplot(q,aes(x,y,group=bin))+geom_polygon(fill=s$fillColor,colour=color_for(s$fillColor),linewidth=lw,alpha=alpha)+
      geom_path(data=circle,aes(x,y,group=value),inherit.aes=FALSE,colour="#AFC1CE",linewidth=lw)+
      annotate("text",x=0,y=sqrt(ticks),label=ticks,family=font,size=s$fontSize/4,colour="#20374A")+
      annotate("text",x=c(0,direction*maxr*1.16,0,-direction*maxr*1.16),y=c(maxr*1.14,0,-maxr*1.14,0),label=c("0°","90°","180°","270°"),family=font,size=s$fontSize/3.5)+coord_fixed()
    customTheme<-no_axes();note<-"Sector area encodes count; ring labels are counts"
    analysis<-list(kind="circular_histogram",bins=bins,counts=counts,clockwise=s$clockwise,radialEncoding="sqrt(count)",n=length(angles))
  } else if(id %in% c("rank_abundance","rarefaction")) {
    data<-data.frame(group=g,taxon=get("taxon"),count=num("count"));data<-data[data$count>0,]
    q<-do.call(rbind,lapply(levels(g),function(k){z<-data[data$group==k,];a<-sort(z$count,decreasing=TRUE);N<-sum(a)
      if(id=="rank_abundance")return(data.frame(x=seq_along(a),y=a/N,group=k))
      sizes<-unique(round(seq(0,N,length.out=as.integer(s$rarefactionSteps))))
      expected<-vapply(sizes,function(n){p<-rep(0,length(a));can<-N-a>=n;p[can]<-exp(lchoose(N-a[can],n)-lchoose(N,n));sum(1-p)},0)
      data.frame(x=sizes,y=expected,group=k)
    }))
    plot<-ggplot(q,aes(x,y,colour=group))+geom_line(linewidth=lw,alpha=alpha)+scale_colour_manual(values=palette_for(levels(g)))
    if(s$showPoints)plot<-plot+geom_point(size=s$pointSize,alpha=alpha)
    if(id=="rank_abundance") {
      plot<-plot+if(s$logAbundance)scale_y_log10(labels=scales::label_percent()) else scale_y_continuous(labels=scales::label_percent())
      xlab<-"Species abundance rank";ylab<-"Relative abundance";note<-"Ranked within community; zero counts excluded from ranks"
    } else {xlab<-"Individuals sampled";ylab<-"Expected richness";note<-"Expected richness without replacement; no extrapolation"}
    axes<-c("x","y");analysis<-list(kind=id,points=q,totals=aggregate(count~group,data,sum),method=if(id=="rarefaction")"sum(1 - choose(N-ni,n)/choose(N,n))" else "descending relative counts")
  } else if(id=="genomic_intervals") {
    q<-data.frame(chr=get("chromosome"),start=num("start"),end=num("end"),label=get("label"),group=g,lane=0)
    for(k in unique(q$chr)) {idx<-which(q$chr==k);idx<-idx[order(q$start[idx])];ends<-numeric()
      for(i in idx){free<-which(ends<=q$start[i]);lane<-if(length(free))free[1] else length(ends)+1;ends[lane]<-q$end[i];q$lane[i]<-lane}
    }
    plot<-ggplot(q,aes(fill=group,colour=group))+geom_rect(aes(xmin=start,xmax=end,ymin=-lane-s$width/2,ymax=-lane+s$width/2),linewidth=lw,alpha=alpha)+common_scale(levels(g))+
      facet_wrap(~chr,ncol=1,scales="free_y")+scale_y_continuous(breaks=NULL)+scale_x_continuous(labels=scales::label_number(big.mark=","))
    if(s$showValues)plot<-plot+geom_text(aes(x=(start+end)/2,y=-lane,label=label),family=font,size=s$fontSize/3.2,colour="#20374A")
    xlab<-"Genomic position (bp, zero-based half-open)";axes<-"x"
    customTheme<-theme(axis.line.y=element_blank(),axis.ticks.y=element_blank(),panel.spacing=grid::unit(s$panelGap,"mm"),strip.background=element_rect(fill="#DFE9F1",colour=NA))
    analysis<-list(kind="genomic_intervals",coordinateSystem="0-based half-open",lanes=q[,c("chr","label","start","end","lane")])
  } else if(id=="alluvial") {
    q<-data.frame(a=get("stage1"),b=get("stage2"),c=get("stage3"),value=num("value"));q<-aggregate(value~a+b+c,q,sum);q<-q[order(q$a,q$b,q$c),];q$group<-q$a;total<-sum(q$value)
    bottoms<-tops<-matrix(0,nrow(q),3);nodes<-list()
    for(j in 1:3) {
      cats<-order_levels(q[[j]]);gap<-total*s$flowGap;cursor<-0
      for(k in cats) {ids<-which(q[[j]]==k);height<-sum(q$value[ids]);bounds<-cursor+c(0,cumsum(q$value[ids]));bottoms[ids,j]<-head(bounds,-1);tops[ids,j]<-tail(bounds,-1)
        nodes[[length(nodes)+1]]<-data.frame(x=j,lo=cursor,hi=cursor+height,label=k);cursor<-cursor+height+gap}
    }
    # All stages share one count-to-height scale; only category gaps differ.
    bands<-do.call(rbind,lapply(seq_len(nrow(q)),function(i)do.call(rbind,lapply(1:2,function(j){t<-seq(0,1,length.out=40);ease<-3*t^2-2*t^3;x<-j+s$nodeWidth/2+(1-s$nodeWidth)*t
      data.frame(x=c(x,rev(x)),y=c(bottoms[i,j]+(bottoms[i,j+1]-bottoms[i,j])*ease,rev(tops[i,j]+(tops[i,j+1]-tops[i,j])*ease)),group=q$group[i],path=paste(i,j))
    }))))
    nodes<-do.call(rbind,nodes)
    plot<-ggplot(bands,aes(x,y,group=path,fill=group,colour=group))+geom_polygon(linewidth=lw,alpha=alpha*.65)+common_scale(order_levels(q$group))+
      geom_rect(data=nodes,aes(xmin=x-s$nodeWidth/2,xmax=x+s$nodeWidth/2,ymin=lo,ymax=hi),inherit.aes=FALSE,fill="#A9BECF",colour="#617C90",linewidth=lw)+
      geom_text(data=nodes,aes(x=x,y=(lo+hi)/2,label=label),inherit.aes=FALSE,family=font,size=s$fontSize/3.2,colour="#20374A")+
      annotate("text",x=1:3,y=max(nodes$hi)+total*.09,label=c(m$stage1,m$stage2,m$stage3),family=font,size=s$fontSize/3.3,colour="#315F88")
    customTheme<-no_axes();analysis<-list(kind="three_stage_flow",total=total,paths=q,stageTotals=rep(total,3),nodes=nodes);note<-"Conserved stage totals; colors follow the initial stage"
  } else if(id=="chord") {
    q<-data.frame(source=get("source"),target=get("target"),value=num("value"));keys<-order_levels(c(q$source,q$target));totals<-setNames(vapply(keys,function(k)sum(q$value[q$source==k|q$target==k]),0),keys)
    gap<-s$chordGap*pi/180;unit<-(2*pi-length(keys)*gap)/sum(totals);ends<-cumsum(totals*unit+gap);starts<-c(0,head(ends,-1));names(starts)<-keys;cursor<-starts
    arcs<-do.call(rbind,lapply(keys,function(k){a<-seq(starts[k],starts[k]+totals[k]*unit,length.out=80);data.frame(x=c(cos(a),rev(cos(a))*.91),y=c(sin(a),rev(sin(a))*.91),group=k)}))
    ribbons<-do.call(rbind,lapply(seq_len(nrow(q)),function(i){a<-q$source[i];b<-q$target[i];span<-q$value[i]*unit;aa<-seq(cursor[a],cursor[a]+span,length.out=24);bb<-seq(cursor[b],cursor[b]+span,length.out=24);cursor[a]<<-cursor[a]+span;cursor[b]<<-cursor[b]+span
      # Connect opposite interval endpoints via quadratic curves through the centre.
      connect<-function(a,b){t<-seq(0,1,length.out=36);cbind((1-t)^2*cos(a)+t^2*cos(b),(1-t)^2*sin(a)+t^2*sin(b))*.91}
      poly<-rbind(cbind(cos(aa),sin(aa))*.91,connect(tail(aa,1),bb[1]),cbind(cos(bb),sin(bb))*.91,connect(tail(bb,1),aa[1]))
      data.frame(x=poly[,1],y=poly[,2],path=i,group=a)
    }))
    labels<-data.frame(angle=starts+totals*unit/2,label=keys)
    plot<-ggplot()+geom_polygon(data=ribbons,aes(x,y,group=path,fill=group,colour=group),linewidth=lw,alpha=alpha*.55)+geom_polygon(data=arcs,aes(x,y,group=group,fill=group,colour=group),linewidth=lw,alpha=alpha)+common_scale(keys)+
      geom_text(data=labels,aes(x=cos(angle)*1.18,y=sin(angle)*1.18,label=label),family=font,size=s$fontSize/3.6,colour="#20374A")+coord_fixed(xlim=c(-1.4,1.4),ylim=c(-1.3,1.3))
    customTheme<-no_axes()+theme(legend.position="none");analysis<-list(kind="undirected_chord",nodeTotals=as.list(totals),edgeTotal=sum(q$value));note<-"Undirected; endpoint arc length is proportional to weight"
  } else if(id=="waffle") {
    keys<-order_levels(get("group"));values<-setNames(num("value"),get("group"))[keys];totalCells<-as.integer(s$waffleCells);quota<-values/sum(values)*totalCells;counts<-floor(quota);remaining<-totalCells-sum(counts)
    if(remaining>0)counts[head(order(quota-counts,decreasing=TRUE),remaining)]<-counts[head(order(quota-counts,decreasing=TRUE),remaining)]+1
    side<-sqrt(totalCells);q<-data.frame(index=seq_len(totalCells),group=factor(rep(keys,counts),levels=keys));q$x<-(q$index-1)%%side;q$y<-floor((q$index-1)/side)
    cols<-palette_for(keys);out<-color_for(cols);names(out)<-keys
    labels<-paste0(keys,"  ",format(round(values/sum(values)*100,2),trim=TRUE),"%")
    plot<-ggplot(q,aes(x,y,fill=group,colour=group))+geom_tile(width=1-s$cellGap,height=1-s$cellGap,linewidth=lw,alpha=alpha)+scale_fill_manual(values=cols,breaks=keys,labels=labels,drop=FALSE)+scale_colour_manual(values=out,guide="none")+coord_fixed()
    customTheme<-no_axes();note<-paste0("Each cell = ",100/totalCells,"%; largest-remainder rounding; legend shows actual proportion")
    analysis<-list(kind="waffle",cells=totalCells,allocation=as.list(counts),proportions=as.list(values/sum(values)))
  } else if(id=="diverging_bar") {
    q<-data.frame(term=get("term"),value=num("value"));q<-q[order(q$value,decreasing=s$sortDirection=="descending"),];q$term<-factor(q$term,levels=rev(q$term));q$direction<-ifelse(q$value<0,"Negative","Nonnegative")
    cols<-c("Negative"=s$colorLow,"Nonnegative"=s$colorHigh);out<-color_for(cols);names(out)<-names(cols)
    plot<-ggplot(q,aes(value,term,fill=direction,colour=direction))+geom_col(width=s$width,linewidth=lw,alpha=alpha)+geom_vline(xintercept=0,linewidth=lw,colour="#617C90")+scale_fill_manual(values=cols)+scale_colour_manual(values=out)+scale_x_continuous(expand=expansion(mult=.18))
    if(s$showValues)plot<-plot+geom_text(aes(label=round(value,3)),hjust=ifelse(q$value<0,1.15,-.15),colour="#20374A",family=font,size=s$fontSize/3.7)
    xlab<-m$value;axes<-"x";analysis<-list(kind="diverging_values",order=as.character(q$term))
  } else if(id=="cumulative_waterfall") {
    values<-num("value");ends<-s$startValue+cumsum(values);starts<-c(s$startValue,head(ends,-1))
    q<-data.frame(label=c("Initial",get("term"),"Final total"),start=c(0,starts,0),end=c(s$startValue,ends,tail(ends,1)),delta=c(s$startValue,values,tail(ends,1)),kind=c("Total",ifelse(values<0,"Decrease","Increase"),"Total"),pos=seq_len(length(values)+2))
    q$lo<-pmin(q$start,q$end);q$hi<-pmax(q$start,q$end);cols<-c("Decrease"=s$colorLow,"Increase"=s$colorHigh,"Total"=s$fillColor);out<-color_for(cols);names(out)<-names(cols)
    plot<-ggplot(q,aes(fill=kind,colour=kind))+geom_rect(aes(xmin=pos-s$width/2,xmax=pos+s$width/2,ymin=lo,ymax=hi),linewidth=lw,alpha=alpha)+
      geom_segment(data=head(q,-1),aes(x=pos+s$width/2,xend=pos+1-s$width/2,y=end,yend=end),colour="#A9BCCB",linewidth=lw)+
      scale_fill_manual(values=cols)+scale_colour_manual(values=out)+scale_x_continuous(breaks=q$pos,labels=q$label)+expand_limits(y=0)
    if(s$showValues)plot<-plot+geom_text(aes(x=pos,y=hi,label=round(delta,2)),vjust=-.5,colour="#20374A",family=font,size=s$fontSize/3.7)+scale_y_continuous(expand=expansion(mult=c(.05,.15)))
    ylab<-m$value;axes<-"y";note<-"Cumulative in row order; steps are changes, endpoints are totals"
    analysis<-list(kind="cumulative_balance",start=s$startValue,deltas=values,cumulative=ends,final=tail(ends,1),order=get("term"))
  } else if(id=="paired_difference") {
    diff<-num("second")-num("first");n<-length(diff);mu<-mean(diff);se<-sd(diff)/sqrt(n);limits<-mu+c(-1,1)*qt(.975,n-1)*se
    q<-data.frame(x=1,value=diff);summary<-data.frame(x=2,value=mu,lo=limits[1],hi=limits[2])
    plot<-ggplot(q,aes(x,value))+geom_point(position=position_jitter(width=s$jitter,height=0,seed=1729),shape=21,size=s$pointSize,fill=s$fillColor,colour=color_for(s$fillColor),stroke=if(s$outline=="none")0 else lw,alpha=alpha)+
      geom_errorbar(data=summary,aes(ymin=lo,ymax=hi),width=.15,linewidth=lw,colour="#315F88")+
      geom_point(data=summary,shape=23,fill=s$colorHigh,colour="#315F88",size=s$pointSize*1.5,stroke=lw)+scale_x_continuous(breaks=c(1,2),labels=c("Paired differences","Mean difference and 95% CI"),limits=c(.5,2.5))
    if(s$showReference)plot<-plot+geom_hline(yintercept=0,linewidth=lw,linetype=2,colour="#8EA5B6")
    ylab<-paste0(m$second," − ",m$first);axes<-"y";note<-paste0("n = ",n," independent pairs; 95% t CI for mean difference")
    analysis<-list(kind="paired_mean_difference",difference="second-first",n=n,mean=mu,se=se,lower=limits[1],upper=limits[2],method="two-sided t interval, df=n-1")
  } else if(id=="hexbin") {
    q<-data.frame(x=num("x"),y=num("y"))
    plot<-ggplot(q,aes(x,y))+geom_hex(bins=as.integer(s$bins),colour=if(s$cellBorder)s$background else NA,linewidth=lw,alpha=alpha)+scale_fill_gradient(low=s$colorLow,high=s$colorHigh)
    fillLabel<-"Bin count";xlab<-m$x;ylab<-m$y;axes<-c("x","y");analysis<-list(kind="hexagonal_counts",bins=s$bins,n=nrow(q))
  }
  if(is.null(plot))NULL else list(plot=plot,x=xlab,y=ylab,analysis=analysis,note=note,axes=axes,theme=customTheme,fillLabel=fillLabel)
 },e)
}
