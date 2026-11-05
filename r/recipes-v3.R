# Each recipe receives typed, validated inputs and the renderer's shared style helpers.
extra_plot <- function(id, env) {
 e<-new.env(parent=env);e$id<-id
 evalq({
  plot<-NULL;xlab<-"";ylab<-"";analysis<-list();note<-""
  spread_labels<-function(y,gap){i<-order(y);z<-y[i];if(length(z)>1)for(j in 2:length(z))z[j]<-max(z[j],z[j-1]+gap);z<-z-mean(z-y[i]);out<-y;out[i]<-z;out}
  if(id=="ridgeline"){
    q<-do.call(rbind,lapply(levels(g),function(k){
      a<-num("value")[g==k];den<-density(a,adjust=s$bandwidth,n=128,from=min(a),to=max(a));base<-match(k,levels(g))
      data.frame(x=c(den$x[1],den$x,tail(den$x,1)),y=c(base,base+den$y/max(den$y)*s$ridgeHeight,base),group=k)
    }))
    q$group<-factor(q$group,levels=levels(g))
    plot<-ggplot(q,aes(x,y,group=group,fill=group,colour=group))+geom_polygon(alpha=alpha,linewidth=lw)+common_scale(levels(g))+
      scale_y_continuous(breaks=seq_along(levels(g)),labels=levels(g))
    xlab<-m$value;ylab<-m$group
  }else if(id=="beeswarm"){
    q<-data.frame(value=num("value"),group=g,pos=as.numeric(g));yrange<-diff(range(q$value))
    diameter<-s$pointSize*.8+lw*.5;dx_min<-diameter*(length(levels(g))+.5)/max(40,s$widthMm-2*s$marginMm-35)
    dy<-max(yrange,.01)*diameter/max(25,s$heightMm-2*s$marginMm-25)
    for(k in levels(g)){
      ids<-which(g==k);ids<-ids[order(q$value[ids])];placed<-integer()
      for(i in ids){
        near<-placed[abs(q$value[placed]-q$value[i])<dy]
        offsets<-seq(min(dx_min,s$swarmSpread),s$swarmSpread,length.out=max(2,ceiling(s$swarmSpread/dx_min)))
        candidates<-c(0,as.vector(rbind(offsets,-offsets)))
        scores<-vapply(candidates,function(dx){if(!length(near))Inf else min((dx-(q$pos[near]-as.numeric(g[i])))^2/dx_min^2+(q$value[i]-q$value[near])^2/dy^2)},0)
        ok<-which(scores>=1);offset<-if(length(ok))candidates[ok[1]] else candidates[which.max(scores)]
        q$pos[i]<-as.numeric(g[i])+offset;placed<-c(placed,i)
      }
    }
    plot<-ggplot(q,aes(pos,value,fill=group,colour=group))+geom_point(shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha)+
      common_scale(levels(g))+scale_x_continuous(breaks=seq_along(levels(g)),labels=levels(g))
    xlab<-m$group;ylab<-m$value
  }else if(id %in% c("histogram_density","frequency_polygon","dotplot")){
    q<-data.frame(value=num("value"),group=g);bins<-as.integer(s$bins)
    if(id=="histogram_density"){
      plot<-ggplot(q,aes(value))+geom_histogram(aes(y=after_stat(density)),bins=bins,fill=s$fillColor,colour=color_for(s$fillColor),alpha=alpha,linewidth=lw)+
        geom_density(adjust=s$bandwidth,linewidth=lw,colour=s$fillColor);ylab<-"Density"
    }else{
      breaks<-seq(min(q$value)-1e-8,max(q$value)+1e-8,length.out=bins+1);q$bin<-findInterval(q$value,breaks,all.inside=TRUE)
      centers<-(head(breaks,-1)+tail(breaks,-1))/2
      if(id=="frequency_polygon"){
        h<-as.data.frame(table(factor(q$bin,levels=seq_len(bins)),q$group));names(h)<-c("bin","group","count");h$x<-centers[as.integer(h$bin)]
        plot<-ggplot(h,aes(x,count,colour=group,group=group))+geom_line(linewidth=lw,alpha=alpha)+scale_colour_manual(values=palette_for(levels(g)))
        if(s$showPoints)plot<-plot+geom_point(size=s$pointSize,alpha=alpha)
      }else{
        q$x<-centers[q$bin];q$count<-ave(q$value,q$bin,FUN=seq_along)
        plot<-ggplot(q,aes(x,count))+geom_point(shape=21,size=s$pointSize,fill=s$fillColor,colour=color_for(s$fillColor),stroke=if(s$outline=="none")0 else lw,alpha=alpha)
      }
      ylab<-"Count"
    }
    xlab<-m$value
  }else if(id %in% c("density2d","bin2d")){
    q<-data.frame(x=num("x"),y=num("y"),group=g)
    if(id=="density2d"){
      plot<-ggplot(q,aes(x,y,colour=group,group=group))+geom_density_2d(bins=as.integer(s$contourBins),adjust=s$bandwidth,linewidth=lw,alpha=alpha)+scale_colour_manual(values=palette_for(levels(g)))
      if(s$showPoints)plot<-plot+geom_point(size=s$pointSize,alpha=alpha*.5)
    }else plot<-ggplot(q,aes(x,y))+geom_bin_2d(bins=as.integer(s$bins),alpha=alpha)+scale_fill_gradient(low=s$colorLow,high=s$colorHigh,name="Count")
    xlab<-m$x;ylab<-m$y
  }else if(id %in% c("contour","filled_contour")){
    q<-data.frame(x=num("x"),y=num("y"),z=num("value"));plot<-ggplot(q,aes(x,y,z=z))
    if(id=="contour")plot<-plot+geom_contour(aes(colour=after_stat(level)),bins=as.integer(s$contourBins),linewidth=lw)+scale_colour_gradient(low=s$colorLow,high=s$colorHigh,name=m$value)
    else plot<-plot+geom_contour_filled(bins=as.integer(s$contourBins),alpha=alpha)+scale_fill_manual(values=grDevices::colorRampPalette(c(s$colorLow,s$colorHigh))(as.integer(s$contourBins)+5),name=m$value)
    xlab<-m$x;ylab<-m$y
  }else if(id %in% c("stacked_area","streamgraph")){
    q<-data.frame(x=num("x"),y=num("y"),group=g)
    if(id=="stacked_area")plot<-ggplot(q,aes(x,y,fill=group,colour=group))+geom_area(position="stack",linewidth=lw,alpha=alpha)+common_scale(levels(g))
    else{
      xs<-sort(unique(q$x));z<-matrix(0,length(xs),length(levels(g)))
      for(i in seq_len(nrow(q)))z[match(q$x[i],xs),as.integer(q$group[i])]<-q$y[i]
      total<-rowSums(z);areas<-do.call(rbind,lapply(seq_len(ncol(z)),function(j){
        lo<--total/2+if(j>1)rowSums(z[,seq_len(j-1),drop=FALSE]) else 0
        data.frame(x=xs,lo=lo,hi=lo+z[,j],group=levels(g)[j])
      }))
      plot<-ggplot(areas,aes(x,ymin=lo,ymax=hi,fill=group,colour=group))+geom_ribbon(linewidth=lw,alpha=alpha)+common_scale(levels(g))
      note<-"Centered baseline; thickness represents amount"
    }
    xlab<-m$x;ylab<-if(id=="streamgraph")"Centered position" else m$y
  }else if(id=="slope"){
    q<-rbind(data.frame(term=get("term"),x=1,y=num("first")),data.frame(term=get("term"),x=2,y=num("second")))
    labels<-q[q$x==2,];labels$labelY<-spread_labels(labels$y,diff(range(q$y))*.065)
    plot<-ggplot(q,aes(x,y,group=term))+geom_line(colour=s$fillColor,linewidth=lw,alpha=alpha)+
      geom_segment(data=labels,aes(x=2,xend=2.17,y=y,yend=labelY),linewidth=lw,colour="#8EA3B3")+
      geom_text(aes(x=2.18,y=labelY,label=term),data=labels,hjust=0,family=font,size=s$fontSize/3.4)+
      scale_x_continuous(breaks=c(1,2),labels=c(m$first,m$second),limits=c(.8,2.6))
    if(s$showPoints)plot<-plot+geom_point(size=s$pointSize,colour=s$fillColor,alpha=alpha)
    ylab<-"Value (common units)"
  }else if(id %in% c("bump","connected_scatter","calibration","residual","lorenz")){
    if(id=="lorenz"){
      q<-do.call(rbind,lapply(levels(g),function(k){a<-sort(num("value")[g==k]);data.frame(x=c(0,seq_along(a)/length(a)),y=c(0,cumsum(a)/sum(a)),group=k)}))
      xlab<-"Cumulative sample proportion";ylab<-"Cumulative value share"
    }else{q<-data.frame(x=num("x"),y=num("y"),group=g);xlab<-m$x;ylab<-m$y}
    if(id=="connected_scatter"){q$sequence<-num("sequence");q<-q[order(q$group,q$sequence),]}
    else q<-q[order(q$group,q$x),]
    q$group<-factor(q$group,levels=levels(g));cols<-palette_for(levels(g))
    plot<-ggplot(q,aes(x,y,colour=group,fill=group,group=group))+scale_colour_manual(values=cols)+scale_fill_manual(values=cols)
    if(id!="residual")plot<-plot+geom_path(linewidth=lw,alpha=alpha)
    if(id %in% c("residual","calibration")||s$showPoints)plot<-plot+geom_point(shape=21,size=s$pointSize,stroke=lw,alpha=alpha)
    if(id=="bump")plot<-plot+scale_y_reverse(breaks=sort(unique(q$y)))
    if(id %in% c("calibration","lorenz")&&s$showReference)plot<-plot+geom_abline(slope=1,intercept=0,linetype=2,colour="#73899B",linewidth=lw)
    if(id=="residual"&&s$showReference)plot<-plot+geom_hline(yintercept=0,linetype=2,colour="#73899B",linewidth=lw)
  }else if(id=="radar"){
    terms<-unique(get("term"));k<-length(terms);angles<-pi/2-2*pi*(seq_len(k)-1)/k
    q<-data.frame(term=get("term"),value=num("value"),group=g);j<-match(q$term,terms);q$x<-q$value/s$radarMax*cos(angles[j]);q$y<-q$value/s$radarMax*sin(angles[j])
    q<-q[order(q$group,match(q$term,terms)),]
    rings<-do.call(rbind,lapply(c(.25,.5,.75,1),function(r)data.frame(x=r*cos(c(angles,angles[1])),y=r*sin(c(angles,angles[1])),ring=r)))
    spokes<-data.frame(x=cos(angles),y=sin(angles),label=terms)
    plot<-ggplot()+geom_path(data=rings,aes(x,y,group=ring),colour="#B5C5D1",linewidth=lw)+
      geom_segment(data=spokes,aes(x=0,y=0,xend=x,yend=y),colour="#B5C5D1",linewidth=lw)+
      geom_polygon(data=q,aes(x,y,fill=group,colour=group),alpha=s$bandAlpha,linewidth=lw)+
      geom_text(data=spokes,aes(x=x*1.18,y=y*1.18,label=label),family=font,size=s$fontSize/3.4)+
      annotate("text",x=0,y=c(.25,.5,.75,1),label=format(s$radarMax*c(.25,.5,.75,1),trim=TRUE),hjust=-.2,family=font,size=s$fontSize/4,colour="#617C90")+
      scale_colour_manual(values=palette_for(levels(g)))+scale_fill_manual(values=palette_for(levels(g)))+coord_fixed(xlim=c(-1.4,1.4),ylim=c(-1.35,1.4))
    if(s$showPoints)plot<-plot+geom_point(data=q,aes(x,y,colour=group),size=s$pointSize)
  }else if(id %in% c("pie","donut","treemap")){
    q<-aggregate(num("value"),list(group=g),sum);names(q)[2]<-"value";q<-q[q$value>0,];q$group<-factor(q$group,levels=order_levels(q$group));q<-q[order(q$group),]
    if(id=="treemap"){
      rectangles<-list()
      split_rect<-function(ids,x,y,w,h){
        if(length(ids)==1){rectangles[[length(rectangles)+1]]<<-data.frame(group=q$group[ids],x=x,y=y,xend=x+w,yend=y+h,value=q$value[ids]);return()}
        cut<-which.min(abs(cumsum(q$value[ids])[-length(ids)]-sum(q$value[ids])/2));a<-ids[seq_len(cut)];b<-ids[-seq_len(cut)];ratio<-sum(q$value[a])/sum(q$value[ids])
        if(w>=h){split_rect(a,x,y,w*ratio,h);split_rect(b,x+w*ratio,y,w*(1-ratio),h)}else{split_rect(a,x,y,w,h*ratio);split_rect(b,x,y+h*ratio,w,h*(1-ratio))}
      }
      split_rect(seq_len(nrow(q)),0,0,1.4,1);r<-do.call(rbind,rectangles)
      plot<-ggplot(r)+geom_rect(aes(xmin=x,xmax=xend,ymin=y,ymax=yend,fill=group,colour=group),linewidth=lw,alpha=alpha)+common_scale(levels(q$group))+coord_fixed()
      if(s$showValues)plot<-plot+geom_text(aes(x=(x+xend)/2,y=(y+yend)/2,label=paste(group,format(round(value,1),trim=TRUE),sep="\n")),family=font,size=s$fontSize/3.4)
    }else{
      q$end<-cumsum(q$value)/sum(q$value)*2*pi;q$start<-c(0,head(q$end,-1));inner<-if(id=="donut")s$holeSize else 0
      polys<-do.call(rbind,lapply(seq_len(nrow(q)),function(i){a<-seq(q$start[i],q$end[i],length.out=80);data.frame(x=c(sin(a),inner*sin(rev(a))),y=c(cos(a),inner*cos(rev(a))),group=q$group[i])}))
      plot<-ggplot(polys,aes(x,y,fill=group,colour=group))+geom_polygon(linewidth=lw,alpha=alpha)+common_scale(levels(q$group))+coord_fixed()
      if(s$showValues){a<-(q$start+q$end)/2;r<-(1+inner)/2;plot<-plot+geom_text(data=q,aes(x=r*sin(a),y=r*cos(a),label=paste0(round(value/sum(value)*100,1),"%")),inherit.aes=FALSE,family=font,size=s$fontSize/3.4)}
    }
  }else if(id=="mosaic"){
    q<-aggregate(num("value"),list(group=g,series=get("series")),sum);names(q)[3]<-"value";total<-sum(q$value);offset<-0;blocks<-list()
    for(k in levels(g)){a<-q[q$group==k,];w<-sum(a$value)/total;y<-c(0,cumsum(a$value)/sum(a$value));blocks[[k]]<-data.frame(x=offset,xend=offset+w,y=head(y,-1),yend=tail(y,-1),series=a$series,group=k);offset<-offset+w}
    r<-do.call(rbind,blocks);cols<-palette_for(unique(r$series));out<-color_for(cols);names(out)<-names(cols)
    plot<-ggplot(r)+geom_rect(aes(xmin=x,xmax=xend,ymin=y,ymax=yend,fill=series,colour=series),linewidth=lw,alpha=alpha)+scale_fill_manual(values=cols)+scale_colour_manual(values=out)+
      scale_x_continuous(breaks=vapply(blocks,function(a)(a$x[1]+a$xend[1])/2,0),labels=names(blocks))+scale_y_continuous(labels=scales::label_percent())
    xlab<-m$group;ylab<-"Within-group proportion"
  }else if(id=="sankey"){
    q<-aggregate(num("value"),list(source=get("source"),target=get("target")),sum);names(q)[3]<-"value";q<-q[q$value>0,]
    left<-aggregate(value~source,q,sum);right<-aggregate(value~target,q,sum);gap<-s$flowGap;h<-1-gap*(max(nrow(left),nrow(right))-1);unit<-h/sum(q$value)
    left$start<-c(0,head(cumsum(left$value*unit+gap),-1));right$start<-c(0,head(cumsum(right$value*unit+gap),-1))
    lo<-setNames(left$start,left$source);ro<-setNames(right$start,right$target);ribbons<-list()
    for(i in seq_len(nrow(q))){a<-q$source[i];b<-q$target[i];height<-q$value[i]*unit;t<-seq(0,1,length.out=50);smooth<-3*t^2-2*t^3;y<-lo[a]+(ro[b]-lo[a])*smooth;x<-s$nodeWidth+(1-2*s$nodeWidth)*t
      ribbons[[i]]<-data.frame(x=c(x,rev(x)),y=c(y,rev(y+height)),source=a,id=i);lo[a]<-lo[a]+height;ro[b]<-ro[b]+height}
    ribbons<-do.call(rbind,ribbons);cols<-palette_for(left$source);out<-color_for(cols);names(out)<-names(cols)
    plot<-ggplot()+geom_polygon(data=ribbons,aes(x,y,group=id,fill=source),colour=NA,alpha=alpha*.65)+
      geom_rect(data=left,aes(xmin=0,xmax=s$nodeWidth,ymin=start,ymax=start+value*unit,fill=source,colour=source),linewidth=lw)+
      geom_rect(data=right,aes(xmin=1-s$nodeWidth,xmax=1,ymin=start,ymax=start+value*unit),fill=s$colorHigh,colour=color_for(s$colorHigh),linewidth=lw)+
      geom_text(data=left,aes(x=-.03,y=start+value*unit/2,label=source),hjust=1,family=font,size=s$fontSize/3.4)+
      geom_text(data=right,aes(x=1.03,y=start+value*unit/2,label=target),hjust=0,family=font,size=s$fontSize/3.4)+
      scale_fill_manual(values=cols)+scale_colour_manual(values=out)+coord_cartesian(xlim=c(-.3,1.4))
  }else if(id=="network"){
    nodes<-sort(unique(c(get("source"),get("target"))));angle<-2*pi*(seq_along(nodes)-1)/length(nodes);v<-data.frame(node=nodes,x=cos(angle),y=sin(angle))
    q<-data.frame(source=get("source"),target=get("target"),value=num("value"));a<-match(q$source,nodes);b<-match(q$target,nodes)
    plot<-ggplot()+geom_segment(data=q,aes(x=v$x[a],y=v$y[a],xend=v$x[b],yend=v$y[b],linewidth=value),colour=s$fillColor,alpha=alpha*.5)+
      scale_linewidth_continuous(range=c(lw*.3,lw*2)*s$edgeScale,guide="none")+
      geom_point(data=v,aes(x,y),size=s$pointSize*2,colour=s$fillColor)+
      geom_text(data=v,aes(x=x*1.16,y=y*1.16,label=node),family=font,size=s$fontSize/3.4)+coord_fixed(xlim=c(-1.35,1.35),ylim=c(-1.35,1.35))
  }else if(id=="funnel"){
    q<-data.frame(estimate=num("estimate"),se=num("se"));limit<-max(q$se)*1.06
    plot<-ggplot(q,aes(estimate,se))+geom_point(shape=21,size=s$pointSize,fill=s$fillColor,colour=color_for(s$fillColor),stroke=if(s$outline=="none")0 else lw,alpha=alpha)+scale_y_reverse()
    if(s$showReference)plot<-plot+annotate("segment",x=rep(s$referenceLine,3),xend=s$referenceLine+c(0,-1.96,1.96)*limit,y=rep(0,3),yend=rep(limit,3),linewidth=lw,colour="#617C90",linetype=2)
    xlab<-m$estimate;ylab<-m$se
  }else if(id=="ternary"){
    a<-num("a");b<-num("b");cc<-num("c");total<-a+b+cc;q<-data.frame(x=(b+cc/2)/total,y=sqrt(3)/2*cc/total,group=g)
    boundary<-data.frame(x=c(0,1,.5,0),y=c(0,0,sqrt(3)/2,0))
    lines<-do.call(rbind,lapply(c(.25,.5,.75),function(t)data.frame(x=c(t,t/2,t,(1+t)/2,t/2,1-t/2),y=c(0,t*sqrt(3)/2,0,(1-t)*sqrt(3)/2,t*sqrt(3)/2,t*sqrt(3)/2),pair=rep(1:3,each=2),level=t)))
    plot<-ggplot()+geom_path(data=lines,aes(x,y,group=interaction(pair,level)),linewidth=lw,colour="#C4D1DA")+
      geom_path(data=boundary,aes(x,y),linewidth=lw,colour="#617C90")+geom_point(data=q,aes(x,y,fill=group,colour=group),shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha)+
      annotate("text",x=c(-.04,1.04,.5),y=c(-.04,-.04,.94),label=c(m$a,m$b,m$c),family=font,size=s$fontSize/3.4)+
      annotate("text",x=c(.25,.5,.75),y=-.025,label=c("25%","50%","75%"),family=font,size=s$fontSize/4)+common_scale(levels(g))+coord_fixed(xlim=c(-.15,1.15),ylim=c(-.1,1))
    note<-"Components divided by row totals; base is component B"
  }else if(id=="oncoprint"){
    q<-data.frame(row=get("row"),column=get("column"),group=g);q$row<-factor(q$row,levels=rev(unique(q$row)));q$column<-factor(q$column,levels=unique(q$column))
    plot<-ggplot(q,aes(column,row,fill=group))+geom_tile(colour=if(s$cellBorder)s$background else NA,linewidth=lw,alpha=alpha)+scale_fill_manual(values=palette_for(levels(g)))
    xlab<-m$column;ylab<-m$row
  }else if(id=="upset"){
    sets<-sort(unique(get("set")));members<-split(get("set"),get("element"))
    combos<-vapply(members,function(a)paste(sort(unique(a)),collapse="\r"),"");counts<-sort(table(combos),decreasing=TRUE);keep<-head(counts,as.integer(s$topIntersections));keys<-names(keep)
    bar<-data.frame(x=seq_along(keep),count=as.numeric(keep));step<-max(bar$count)*.085
    dots<-expand.grid(x=bar$x,index=seq_along(sets));dots$active<-mapply(function(x,j)sets[j] %in% strsplit(keys[x],"\r",fixed=TRUE)[[1]],dots$x,dots$index);dots$y<--dots$index*step
    segments<-do.call(rbind,lapply(bar$x,function(i){a<-dots[dots$x==i&dots$active,];data.frame(x=i,y=min(a$y),yend=max(a$y))}))
    plot<-ggplot()+geom_col(data=bar,aes(x,count),width=.65,fill=s$fillColor,alpha=alpha)+
      geom_segment(data=segments,aes(x=x,xend=x,y=y,yend=yend),linewidth=lw,colour=s$fillColor)+
      geom_point(data=dots,aes(x,y),colour=ifelse(dots$active,s$fillColor,"#CFDAE2"),size=s$pointSize)+
      geom_text(data=bar,aes(x,count,label=count),vjust=-.5,family=font,size=s$fontSize/3.6)+
      annotate("text",x=.3,y=-seq_along(sets)*step,label=sets,hjust=1,family=font,size=s$fontSize/3.6)+
      scale_x_continuous(limits=c(-2.5,length(keep)+.5),breaks=NULL)+scale_y_continuous(breaks=pretty(c(0,max(bar$count))))
    ylab<-"Exact intersection size";note<-paste0("Showing ",length(keep)," / ",length(counts)," exact combinations; total elements: ",length(members))
    analysis<-list(kind="exact_intersections",totalElements=length(members),counts=as.list(counts),displayed=as.list(keep))
  }else if(id %in% c("scree","loading")){
    mat<-as.data.frame(lapply(d[,unlist(m$columns),drop=FALSE],as.numeric));pc<-prcomp(mat,center=TRUE,scale.=s$scalePca);variance<-pc$sdev^2/sum(pc$sdev^2)*100
    if(id=="scree"){
      q<-data.frame(component=seq_along(variance),variance=variance)
      plot<-ggplot(q,aes(component,variance))+geom_col(fill=s$fillColor,alpha=alpha,width=.65)+geom_line(linewidth=lw,colour=s$fillColor)+scale_x_continuous(breaks=q$component)
      if(s$showPoints)plot<-plot+geom_point(size=s$pointSize,colour=s$fillColor)
      xlab<-"Principal component";ylab<-"Explained variance (%)"
    }else{
      q<-data.frame(x=pc$rotation[,1],y=pc$rotation[,2],label=unlist(m$columns))
      q$labelX<-ifelse(q$x<0,-.85,.85);q$labelY<-q$y*1.1
      for(side in unique(q$labelX)){ii<-which(q$labelX==side);q$labelY[ii]<-spread_labels(q$labelY[ii],min(.14,1.7/max(1,length(ii)-1)))}
      plot<-ggplot(q)+geom_hline(yintercept=0,colour="#B5C5D1",linewidth=lw)+geom_vline(xintercept=0,colour="#B5C5D1",linewidth=lw)+
        geom_segment(aes(x=0,y=0,xend=x,yend=y),arrow=grid::arrow(length=grid::unit(2,"mm")),linewidth=lw,colour=s$fillColor)+
        geom_segment(aes(x=x,y=y,xend=labelX,yend=labelY),linewidth=lw,colour="#ADBDC9")+
        geom_text(aes(x=labelX,y=labelY,label=label),hjust=ifelse(q$x<0,1,0),family=font,size=s$fontSize/3.4)+coord_fixed(xlim=c(-1.45,1.45),ylim=c(-1.25,1.25))
      xlab<-"PC1 loading";ylab<-"PC2 loading"
    }
    analysis<-list(kind="PCA",scaled=s$scalePca,variancePercent=variance);note<-if(s$scalePca)"Centered and scaled" else "Centered only; original units retained"
  }
  axes<-c("x","y")
  if(id %in% c("radar","pie","donut","treemap","mosaic","sankey","network","ternary","oncoprint","upset"))axes<-character()
  if(id %in% c("ridgeline","bump"))axes<-"x"
  if(id %in% c("beeswarm","slope","scree"))axes<-"y"
  if(is.null(plot))NULL else list(plot=plot,x=xlab,y=ylab,analysis=analysis,note=note,axes=axes)
 },e)
}
