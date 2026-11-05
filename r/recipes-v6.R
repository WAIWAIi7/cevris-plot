variant_plot <- function(id, env) {
 e<-new.env(parent=env);e$id<-id
 evalq({
  plot<-NULL;xlab<-"";ylab<-"";analysis<-list();note<-"";axes<-character();customTheme<-NULL;fillLabel<-NULL
  bars<-c("bar_plain","bar_error","bar_horizontal","bar_horizontal_points","bar_outline","bar_sorted","bar_labels","grouped_bar_plain","grouped_bar_points","grouped_bar_horizontal","grouped_box","grouped_violin")
  if(id %in% bars) {
    grouped<-startsWith(id,"grouped_"); horizontal<-grepl("horizontal",id)
    series<-if(grouped)factor(get("series"),levels=order_levels(get("series"))) else g
    q<-data.frame(group=g,series=series,value=num("value"),pos=as.numeric(g)*(1+s$groupGap))
    if(id=="bar_sorted") {means<-tapply(q$value,q$group,mean);lev<-names(sort(means,decreasing=TRUE));q$group<-factor(q$group,levels=lev);q$pos<-as.numeric(q$group)*(1+s$groupGap)}
    sums<-do.call(rbind,lapply(split(q,interaction(q$group,q$series,drop=TRUE)),function(a) {b<-summary_data(a);b$series<-a$series[1];b}))
    cols<-palette_for(levels(series));edges<-color_for(cols);names(edges)<-names(cols)
    pd<-position_dodge(width=s$width)
    plot<-ggplot(q,aes(pos,value,fill=series,colour=series,group=interaction(group,series)))
    if(id=="grouped_box")plot<-plot+geom_boxplot(width=s$width,position=pd,alpha=alpha,linewidth=lw,outlier.shape=if(s$showPoints)NA else 21)
    else if(id=="grouped_violin")plot<-plot+geom_violin(width=s$width,position=pd,alpha=alpha,linewidth=lw,scale="width",trim=TRUE)
    else {
      plot<-plot+geom_col(data=sums,width=s$width,position=pd,alpha=alpha,linewidth=lw)
      if(s$errorType!="none"){
        if(anyNA(sums$lower))stop("Each group needs at least two observations for error bars.")
        plot<-plot+geom_errorbar(data=sums,aes(ymin=lower,ymax=upper),position=pd,width=s$width*.25,linewidth=lw,colour="#2E2E33")
      }
      if(s$showValues)plot<-plot+geom_text(data=sums,aes(label=round(value,1)),position=pd,vjust=-.65,family=font,size=s$fontSize/3.5,colour="#2E2E33")
    }
    if(s$showPoints) plot<-plot+geom_point(position=if(grouped)position_jitterdodge(jitter.width=s$jitter,dodge.width=s$width,seed=1729) else position_jitter(width=s$jitter,height=0,seed=1729),shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha)
    if(id=="bar_outline") {edges<-cols;cols[]<-s$background}
    plot<-plot+scale_fill_manual(values=cols)+scale_colour_manual(values=edges,guide="none")+scale_x_continuous(breaks=seq_along(levels(q$group))*(1+s$groupGap),labels=levels(q$group),expand=expansion(add=.6))
    if(horizontal)plot<-plot+coord_flip() else axes<-"y"
    xlab<-m$group;ylab<-m$value;fillLabel<-if(grouped)m$series else m$group
    analysis<-list(kind=if(id %in% c("grouped_box","grouped_violin"))"raw_distribution" else "group_mean",errorType=s$errorType,groups=sums[,c("group","series","value","lower","upper","n")])
  }else if(id=="grouped_stacked_bar"){
    component<-factor(get("component"),levels=order_levels(get("component")));series<-factor(get("series"),levels=order_levels(get("series")));ng<-length(levels(series))
    q<-data.frame(group=g,series=series,component=component,value=num("value"));q$pos<-(as.numeric(g)-1)*(ng+1)+as.numeric(series)
    cols<-palette_for(levels(component));edges<-color_for(cols);names(edges)<-names(cols)
    plot<-ggplot(q,aes(pos,value,fill=component,colour=component))+geom_col(width=s$width,alpha=alpha,linewidth=lw)+scale_fill_manual(values=cols)+scale_colour_manual(values=edges,guide="none")
    labels<-unique(q[,c("group","series","pos")]);plot<-plot+scale_x_continuous(breaks=labels$pos,labels=paste(labels$group,labels$series,sep="\n"))
    xlab<-m$group;ylab<-m$value;axes<-"y";fillLabel<-m$component;analysis<-list(kind="grouped_composition",total=sum(q$value))
  }else if(id=="bar_line"){
    q<-data.frame(group=g,pos=as.numeric(g),value=num("value"),reference=num("reference"));cols<-palette_for(levels(g));edges<-color_for(cols);names(edges)<-names(cols)
    plot<-ggplot(q,aes(pos,value))+geom_col(aes(fill=group,colour=group),width=s$width,alpha=alpha,linewidth=lw)+scale_fill_manual(values=cols)+scale_colour_manual(values=edges,guide="none")+
      geom_line(aes(y=reference),colour="#2E2E33",linewidth=lw)+geom_point(aes(y=reference),shape=21,fill=s$background,colour="#2E2E33",size=s$pointSize,stroke=lw)+scale_x_continuous(breaks=q$pos,labels=q$group)
    if(s$showValues)plot<-plot+geom_text(aes(label=round(value,1)),vjust=-.7,family=font,size=s$fontSize/3.5)
    xlab<-m$group;ylab<-m$value;axes<-"y";note<-paste0("Line: ",m$reference,"; shared units and axis")
  }else if(id=="circular_bar"){
    q<-data.frame(term=factor(get("group"),levels=order_levels(get("group"))),value=num("value"));cols<-palette_for(levels(q$term));edges<-color_for(cols);names(edges)<-names(cols)
    plot<-ggplot(q,aes(term,sqrt(value),fill=term,colour=term))+geom_col(width=.9,linewidth=lw,alpha=alpha)+scale_fill_manual(values=cols)+scale_colour_manual(values=edges,guide="none")+coord_polar(clip="off")+scale_y_continuous(breaks=NULL)
    if(s$showValues)plot<-plot+geom_text(aes(label=round(value,1)),vjust=-.7,family=font,size=s$fontSize/3.5)
    customTheme<-theme(axis.line=element_blank(),axis.ticks=element_blank(),axis.title=element_blank(),panel.grid=element_blank());note<-"Sector area represents value (radius = square root of value)";fillLabel<-m$group
  }else if(id %in% c("binary_heatmap","circular_heatmap")){
    rr<-sort(unique(get("row")));cc<-sort(unique(get("column")));q<-data.frame(row=factor(get("row"),levels=rr),column=factor(get("column"),levels=cc),value=num("value"))
    if(id=="circular_heatmap" && s$normalization=="row_z")q$value<-ave(q$value,q$row,FUN=function(x)as.numeric(scale(x)))
    border<-if(s$cellBorder)"#657989" else NA_character_
    if(id=="binary_heatmap"){
      q$presence<-factor(q$value,levels=c(0,1),labels=c("Absent","Present"))
      plot<-ggplot(q,aes(column,row,fill=presence))+geom_tile(colour=border,linewidth=lw)+scale_fill_manual(values=c(Absent=s$colorLow,Present=s$colorHigh))+coord_fixed();fillLabel<-"Presence"
    }else {
      q$radius<-as.numeric(q$column)+2
      plot<-ggplot(q,aes(row,radius,fill=value))+geom_tile(colour=border,linewidth=lw,width=1,height=1)+scale_y_continuous(limits=c(0,length(cc)+2.6),breaks=seq_along(cc)+2,labels=cc)+coord_polar(theta="x")+scale_fill_gradient2(low=s$colorLow,mid=s$colorMid,high=s$colorHigh,midpoint=if(s$normalization=="row_z")0 else median(q$value));fillLabel<-m$value
    }
    customTheme<-theme(axis.line=element_blank(),axis.ticks=element_blank(),axis.title=element_blank(),panel.grid=element_blank())
  }else if(id=="correlation_bubble"){
    columns<-unlist(m$columns);mat<-as.matrix(data.frame(lapply(d[,columns,drop=FALSE],as.numeric),check.names=FALSE));colnames(mat)<-columns
    cm<-cor(mat,method=s$correlationMethod);q<-expand.grid(row=columns,column=columns);q$value<-as.vector(cm)
    plot<-ggplot(q,aes(column,row,size=abs(value),fill=value))+geom_point(shape=21,colour="#718598",stroke=lw,alpha=alpha)+scale_size_area(max_size=s$pointSize*4,limits=c(0,1),name="|r|")+scale_fill_gradient2(low=s$colorLow,mid=s$colorMid,high=s$colorHigh,limits=c(-1,1),name="r")+coord_fixed()
    customTheme<-theme(axis.line=element_blank(),axis.ticks=element_blank());analysis<-list(kind="correlation",method=s$correlationMethod,matrix=cm);fillLabel<-"r"
  }
  if(is.null(plot))NULL else list(plot=plot,x=xlab,y=ylab,analysis=analysis,note=note,axes=axes,theme=customTheme,fillLabel=fillLabel)
 },envir=e)
}
