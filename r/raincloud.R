raincloud_plot <- function(id, env) {
  if(!id %in% c("raincloud","raincloud_horizontal","grouped_raincloud"))return(NULL)
  e<-new.env(parent=env);e$id<-id
  evalq({
    horizontal<-id!="raincloud";faceted<-id=="grouped_raincloud"
    series<-if(faceted)factor(get("series"),levels=order_levels(get("series"))) else g
    panels<-if(faceted)factor(get("group"),levels=unique(get("group"))) else factor(rep("All",length(g)))
    lev<-levels(series);nlev<-length(lev)
    # Space lanes from their real extents, preventing a cloud spilling into the next group.
    half_box<-s$rainBoxWidth/2
    stride<-s$width+2*half_box+2*s$cloudGap+2*s$rainSpread+.18+s$groupGap
    positions<-setNames((if(horizontal)rev(seq_len(nlev)) else seq_len(nlev))*stride,lev)
    q<-data.frame(panel=panels,group=series,value=num("value"),pos=unname(positions[as.character(series)]))
    chunks<-split(q,interaction(q$panel,q$group,drop=TRUE),drop=TRUE)
    summaries<-do.call(rbind,lapply(chunks,function(a){
      qs<-quantile(a$value,c(.25,.5,.75),names=FALSE,type=7);iqr<-qs[3]-qs[1]
      inside<-a$value[a$value>=qs[1]-1.5*iqr&a$value<=qs[3]+1.5*iqr]
      data.frame(panel=a$panel[1],group=a$group[1],pos=a$pos[1],n=nrow(a),mean=mean(a$value),q1=qs[1],median=qs[2],q3=qs[3],lower=min(inside),upper=max(inside))
    }))
    columns<-list();bandwidths<-list()
    if(s$cloudVisible)for(k in seq_along(chunks)){
      a<-chunks[[k]]
      if(length(a$value)<3||length(unique(a$value))<2)stop("Each density cloud needs at least three observations with variation.")
      den<-density(a$value,adjust=s$bandwidth,from=min(a$value),to=max(a$value),n=256)
      direction<-if(horizontal)1 else -1
      baseline<-a$pos[1]+direction*(half_box+s$cloudGap)
      columns[[k]]<-data.frame(panel=a$panel[1],group=a$group[1],lane=c(baseline,baseline+direction*den$y/max(den$y)*s$width,baseline),value=c(min(den$x),den$x,max(den$x)))
      bandwidths[[k]]<-data.frame(panel=a$panel[1],group=a$group[1],bandwidth=den$bw)
    }
    cols<-palette_for(lev);edges<-color_for(cols);names(edges)<-lev
    plot<-ggplot()
    if(s$cloudVisible){
      cloud<-do.call(rbind,columns)
      plot<-plot+geom_polygon(data=cloud,mapping=if(horizontal)aes(value,lane,group=group,fill=group,colour=group) else aes(lane,value,group=group,fill=group,colour=group),alpha=alpha*s$cloudOpacity,linewidth=lw)
    }
    if(s$boxVisible){
      a<-summaries
      plot<-plot+geom_rect(data=a,mapping=if(horizontal)aes(xmin=q1,xmax=q3,ymin=pos-half_box,ymax=pos+half_box,fill=group,colour=group) else aes(xmin=pos-half_box,xmax=pos+half_box,ymin=q1,ymax=q3,fill=group,colour=group),alpha=alpha*s$boxOpacity,linewidth=lw)
      # Median and whiskers are meaningful summary lines, retained even without fill outlines.
      marks<-rbind(
        data.frame(panel=a$panel,lane=a$pos-half_box,laneEnd=a$pos+half_box,value=a$median,valueEnd=a$median),
        data.frame(panel=a$panel,lane=a$pos,laneEnd=a$pos,value=a$lower,valueEnd=a$q1),
        data.frame(panel=a$panel,lane=a$pos,laneEnd=a$pos,value=a$q3,valueEnd=a$upper),
        data.frame(panel=a$panel,lane=a$pos-half_box*.65,laneEnd=a$pos+half_box*.65,value=a$lower,valueEnd=a$lower),
        data.frame(panel=a$panel,lane=a$pos-half_box*.65,laneEnd=a$pos+half_box*.65,value=a$upper,valueEnd=a$upper))
      plot<-plot+geom_segment(data=marks,mapping=if(horizontal)aes(value,lane,xend=valueEnd,yend=laneEnd) else aes(lane,value,xend=laneEnd,yend=valueEnd),colour="#2E2E33",linewidth=lw)
    }
    if(s$rainVisible){
      set.seed(1729)
      q$lane<-q$pos+(if(horizontal)-1 else 1)*(half_box+s$cloudGap+s$rainSpread)+runif(nrow(q),-s$rainSpread,s$rainSpread)
      plot<-plot+geom_point(data=q,mapping=if(horizontal)aes(value,lane,fill=group,colour=group) else aes(lane,value,fill=group,colour=group),shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha*s$rainOpacity)
    }else if(s$boxVisible){
      outliers<-do.call(rbind,lapply(chunks,function(a){b<-summaries[summaries$panel==a$panel[1]&summaries$group==a$group[1],];a[a$value<b$lower|a$value>b$upper,,drop=FALSE]}))
      if(nrow(outliers))plot<-plot+geom_point(data=outliers,mapping=if(horizontal)aes(value,pos,fill=group,colour=group) else aes(pos,value,fill=group,colour=group),shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha*s$rainOpacity)
    }
    # Keep all group labels when individual components are hidden.
    plot<-plot+geom_blank(data=q,mapping=if(horizontal)aes(value,pos) else aes(pos,value))+
      scale_fill_manual(values=cols,drop=FALSE)+scale_colour_manual(values=edges,drop=FALSE)
    plot<-plot+if(horizontal)scale_y_continuous(breaks=positions,labels=names(positions),expand=expansion(add=.2)) else scale_x_continuous(breaks=positions,labels=names(positions),expand=expansion(add=.2))
    customTheme<-NULL
    if(faceted){
      plot<-plot+facet_grid(rows=vars(panel))
      customTheme<-theme(panel.spacing.y=grid::unit(s$rainPanelGap,"mm"),strip.background=element_rect(fill=s$panelBackground,colour=NA),strip.text.y=element_text(family=font,size=s$fontSize,colour="#2E2E33",angle=0))
    }
    analysis<-list(kind="raincloud",summary="Type-7 quartiles; whiskers at observations within 1.5 IQR; outliers retained",groups=summaries[,c("panel","group","n","mean","q1","median","q3","lower","upper")],density=list(method="Gaussian KDE / nrd0",adjust=s$bandwidth,trim="observed range",scale="equal peak width",bandwidths=bandwidths),layers=list(cloud=s$cloudVisible,box=s$boxVisible,rain=s$rainVisible),jitter=list(seed=1729,measurementJitter=0))
    list(plot=plot,x=if(horizontal)m$value else if(faceted)m$series else m$group,y=if(horizontal){if(faceted)m$series else m$group}else m$value,axes=if(horizontal)"x" else "y",analysis=analysis,note="",theme=customTheme,fillLabel=if(faceted)m$series else m$group)
  },e)
}
