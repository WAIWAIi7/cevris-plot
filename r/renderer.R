# Approved recipes only. The input is data and typed settings, never R source.
args_all <- commandArgs(FALSE)
script_path <- sub("^--file=", "", args_all[grepl("^--file=", args_all)])
if(!length(script_path))script_path<-file.path(getwd(),"renderer.R")
app_root <- normalizePath(file.path(dirname(script_path), ".."), mustWork=FALSE)
private_lib <- file.path(app_root, ".runtime", "library")
if (dir.exists(private_lib)) .libPaths(c(private_lib,.libPaths()))
suppressPackageStartupMessages(library(ggplot2))
suppressPackageStartupMessages(library(jsonlite))
args <- if(exists("figure_library_mode",inherits=FALSE)&&isTRUE(figure_library_mode)) "--library" else commandArgs(TRUE)
if (length(args)<1) stop("Missing command")
if (args[1]=="--diagnostics") {
  fonts <- sort(unique(systemfonts::system_fonts()$family))
  write_json(list(R=as.character(getRversion()),ggplot2=as.character(packageVersion("ggplot2")),fonts=fonts,
    packages=as.list(setNames(vapply(c("ggplot2","jsonlite","svglite","systemfonts","ragg","MASS","survival","hexbin"),function(x)as.character(packageVersion(x)),""),c("ggplot2","jsonlite","svglite","systemfonts","ragg","MASS","survival","hexbin"))),
    devices=c("svg","png","pdf","tiff")),stdout(),auto_unbox=TRUE)
  quit(save="no")
}
input <- NULL; format <- NULL; output <- NULL
warnings_seen <- character()
# INLINE_RECIPE_PACK
if(!exists("extra_plot"))source(file.path(dirname(script_path),"recipes-v3.R"))
# INLINE_RESEARCH_PACK
if(!exists("research_plot"))source(file.path(dirname(script_path),"recipes-v4.R"))
 # INLINE_VARIANT_PACK
if(!exists("variant_plot"))source(file.path(dirname(script_path),"recipes-v6.R"))
available_fonts <- systemfonts::system_fonts()
# INLINE_RAINCLOUD_PACK
if(!exists("raincloud_plot"))source(file.path(dirname(script_path),"raincloud.R"))
render <- function(as_grob=FALSE) {
  p <- input; s <- p$params; m <- p$mapping; id <- p$recipeId
  rows <- p$data$rows
  d <- as.data.frame(setNames(lapply(p$data$columns,function(col) vapply(rows,function(r) {
    v <- r[[col]]; if(is.null(v)) NA_character_ else as.character(v)
  },"")),unlist(p$data$columns)),check.names=FALSE,stringsAsFactors=FALSE)
  fields <- unique(unlist(m)); fields <- fields[nzchar(fields)]
  if(isTRUE(s$omitMissing)) d <- d[complete.cases(d[,fields,drop=FALSE]) & apply(d[,fields,drop=FALSE],1,function(x) all(nzchar(trimws(x)))),,drop=FALSE]
  get <- function(key,default=NULL) if(!is.null(m[[key]])&&nzchar(m[[key]])) d[[m[[key]]]] else default
  num <- function(key) as.numeric(get(key))
  order_levels <- function(v) {
    v <- unique(as.character(v)); specified <- unlist(p$groupOrder)
    c(specified[specified %in% v],sort(setdiff(v,specified)))
  }
  groups <- get("group",rep("All",nrow(d)))
  g <- factor(groups,levels=order_levels(groups))
  base_palette <- c("#B5522A","#D9B382","#8BA77E","#5B7EA6","#3F6B4F","#D69CA0","#2E2E33")
  shift <- function(colors,amount) {
    rgb <- grDevices::col2rgb(colors)/255
    if(amount<0)rgb <- rgb*(1+amount) else rgb <- rgb+(1-rgb)*amount
    grDevices::rgb(rgb[1,],rgb[2,],rgb[3,])
  }
  palette_for <- function(keys) {
    vals <- rep(base_palette,length.out=length(keys));names(vals)<-keys
    for(k in keys) if(!is.null(p$colors[[k]])) vals[k] <- p$colors[[k]]
    vals
  }
  color_for <- function(cols) {
    if(s$outline=="none") rep("#00000000",length(cols)) else shift(cols,if(s$outline=="lighter") .38 else -.22)
  }
  font <- s$fontFamily
  fonts <- available_fonts
  if(!font %in% fonts$family)stop(paste0("Font unavailable: ",font,". Select an installed font."))
  set.seed(1729)
  lw <- s$linewidth
  alpha <- s$alpha
  xlab <- "";ylab <- "";analysis_result<-list();extra<-NULL;extra_note<-""
  common_scale <- function(keys) {
    cols <- palette_for(keys);out <- color_for(cols);names(out)<-keys
    list(scale_fill_manual(values=cols,drop=FALSE),scale_colour_manual(values=out,drop=FALSE))
  }
  summary_data <- function(data) {
    split_data<-split(data,data$group,drop=TRUE)
    do.call(rbind,lapply(split_data,function(a) {
      n<-nrow(a);sdv<-if(n>1)sd(a$value) else NA_real_
      e<-switch(s$errorType,sd=sdv,sem=sdv/sqrt(n),ci=if(n>1)qt(.975,n-1)*sdv/sqrt(n) else NA_real_,none=0)
      data.frame(group=a$group[1],pos=a$pos[1],value=mean(a$value),lower=mean(a$value)-e,upper=mean(a$value)+e,n=n)
    }))
  }
  if(id %in% c("violin","box","bar","strip","lollipop","mean_interval")) {
    q<-data.frame(group=g,value=num("value"),pos=as.numeric(g)*(1+s$groupGap))
    plot<-ggplot(q,aes(x=pos,y=value,group=group,fill=group,colour=group))
    if(id=="violin")plot<-plot+geom_violin(width=s$width,trim=TRUE,adjust=s$bandwidth,linewidth=lw,alpha=alpha,scale="width")
    if(id=="box")plot<-plot+geom_boxplot(width=s$width,outlier.shape=if(s$showPoints)NA else 21,linewidth=lw,alpha=alpha)
    if(id=="bar"){
      sums<-summary_data(q)
      if(anyNA(sums$lower)&&s$errorType!="none")stop("Each group needs two observations for error bars")
      plot<-plot+geom_col(data=sums,width=s$width,alpha=alpha,linewidth=lw)
      if(s$errorType!="none")plot<-plot+geom_errorbar(data=sums,aes(ymin=lower,ymax=upper),width=s$width*.35,colour="#2E2E33",linewidth=lw)
    }
    if(id=="lollipop"){
      sums<-summary_data(q);plot<-plot+geom_segment(data=sums,aes(xend=pos,y=0,yend=value),linewidth=lw,colour="#59748A")+
        geom_point(data=sums,shape=21,size=s$pointSize*1.5,stroke=lw,alpha=alpha)
    }
    if(id=="mean_interval"){
      sums<-summary_data(q)
      if(s$errorType!="none")plot<-plot+geom_errorbar(data=sums,aes(ymin=lower,ymax=upper),width=.15,linewidth=lw,colour="#2E2E33")
      plot<-plot+geom_point(data=sums,shape=23,size=s$pointSize*1.5,stroke=lw,alpha=alpha)
      analysis_result<-list(kind="group_mean",errorType=s$errorType,groups=sums[,c("group","value","lower","upper","n")])
    }
    if(id=="strip"||(id %in% c("violin","box","bar","mean_interval")&&s$showPoints)){
      qp<-q
      plot<-plot+geom_point(data=qp,position=position_jitter(width=s$jitter,height=0,seed=1729),size=s$pointSize,shape=21,stroke=if(s$outline=="none")0 else lw,alpha=alpha)
    }
    if(id %in% c("violin","strip")&&s$summary!="none"){
      summary_fun<-if(s$summary=="median") median else mean
      centers<-aggregate(value~group+pos,q,summary_fun)
      plot<-plot+geom_segment(data=centers,aes(x=pos-s$width*.22,xend=pos+s$width*.22,y=value,yend=value),colour="#2E2E33",linewidth=lw,inherit.aes=FALSE)
    }
    plot<-plot+common_scale(levels(g))+scale_x_continuous(breaks=seq_along(levels(g))*(1+s$groupGap),labels=levels(g),expand=expansion(add=.6))
    xlab<-m$group;ylab<-m$value
  }else if(id %in% c("scatter","bubble","line")){
    q<-data.frame(x=num("x"),y=num("y"),group=g)
    plot<-ggplot(q,aes(x,y,fill=group,colour=group,group=group))
    if(id=="line"){
      plot<-plot+geom_line(linewidth=lw,alpha=alpha)
      # Line color encodes group even when a filled-shape outline is disabled.
      plot<-plot+scale_colour_manual(values=palette_for(levels(g)))+scale_fill_manual(values=palette_for(levels(g)))
      if(s$showPoints)plot<-plot+geom_point(size=s$pointSize,shape=21,stroke=lw,alpha=alpha)
    }else{
      if(id=="bubble"){q$size<-num("size");plot<-ggplot(q,aes(x,y,fill=group,colour=group,size=size))+geom_point(shape=21,stroke=if(s$outline=="none")0 else lw,alpha=alpha)+scale_size_area(max_size=s$pointSize*4,name=m$size)}
      else plot<-plot+geom_point(shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha)
      if(id=="scatter"&&isTRUE(s$regression))plot<-plot+geom_smooth(method="lm",formula=y~x,se=TRUE,linewidth=lw,colour="#2E2E33",alpha=.15)
      plot<-plot+common_scale(levels(g))
    }
    xlab<-m$x;ylab<-m$y
  }else if(id=="paired"){
    q<-data.frame(group=g,value=num("value"),subject=get("subject"))
    plot<-ggplot(q,aes(group,value,group=subject))+geom_line(colour="#8098AB",linewidth=lw,alpha=alpha)+
      geom_point(aes(fill=group),shape=21,size=s$pointSize,stroke=lw,colour="#2E2E33",alpha=alpha)+scale_fill_manual(values=palette_for(levels(g)))
    xlab<-m$group;ylab<-m$value
  }else if(id %in% c("grouped_bar","stacked_bar","percent_bar")){
    series<-factor(get("series"),levels=order_levels(get("series")));q<-data.frame(group=g,value=num("value"),series=series)
    cols<-palette_for(levels(series));out<-color_for(cols);names(out)<-names(cols)
    if(id=="grouped_bar"){
      sums<-do.call(rbind,lapply(split(q,interaction(q$group,q$series,drop=TRUE)),function(a){
        z<-a;z$pos<-as.numeric(z$group);b<-summary_data(z);b$series<-a$series[1];b
      }))
      if(anyNA(sums$lower)&&s$errorType!="none")stop("误差线每个组合至少需要两条观测")
      plot<-ggplot(sums,aes(group,value,fill=series,colour=series))+geom_col(position=position_dodge(.8),width=s$width,linewidth=lw,alpha=alpha)
      if(s$errorType!="none")plot<-plot+geom_errorbar(aes(ymin=lower,ymax=upper,group=series),position=position_dodge(.8),width=.16,linewidth=lw,colour="#2E2E33")
    }else{
      sums<-aggregate(value~group+series,q,sum)
      plot<-ggplot(sums,aes(group,value,fill=series,colour=series))+geom_col(position=if(id=="percent_bar")"fill" else "stack",width=s$width,linewidth=lw,alpha=alpha)
      if(id=="percent_bar")plot<-plot+scale_y_continuous(labels=scales::label_percent())
    }
    plot<-plot+scale_fill_manual(values=cols)+scale_colour_manual(values=out)
    xlab<-m$group;ylab<-if(id=="percent_bar")"Proportion" else m$value
  }else if(id %in% c("histogram","density","ecdf")){
    q<-data.frame(value=num("value"),group=g)
    plot<-ggplot(q,aes(value,fill=group,colour=group))
    if(id=="histogram")plot<-plot+geom_histogram(bins=s$bins,position="identity",alpha=alpha*.65,linewidth=lw)+common_scale(levels(g))
    if(id=="density")plot<-plot+geom_density(adjust=s$bandwidth,alpha=alpha*.4,linewidth=lw)+common_scale(levels(g))
    if(id=="ecdf")plot<-plot+stat_ecdf(geom="step",linewidth=lw,alpha=alpha)+scale_colour_manual(values=palette_for(levels(g)))
    xlab<-m$value;ylab<-switch(id,histogram="Count",density="Density",ecdf="Cumulative proportion")
  }else if(id %in% c("heatmap","correlation")){
    if(id=="correlation"){
      mat<-as.matrix(data.frame(lapply(d[,unlist(m$columns),drop=FALSE],as.numeric),check.names=FALSE))
      colnames(mat)<-unlist(m$columns);mat<-cor(mat,method=s$correlationMethod)
    }else{
      rr<-sort(unique(get("row")));cc<-sort(unique(get("column")))
      if(length(rr)*length(cc)>40000)stop("Heatmap exceeds 40000 cells; filter the data")
      mat<-matrix(NA_real_,length(rr),length(cc),dimnames=list(rr,cc))
      for(i in seq_len(nrow(d)))mat[as.character(get("row")[i]),as.character(get("column")[i])]<-num("value")[i]
      if(s$normalization=="row_z"){
        if(any(apply(mat,1,sd,na.rm=TRUE)==0,na.rm=TRUE))stop("常数行无法标准化，请保留原始数值或移除常数行")
        mat<-t(scale(t(mat)))
      }
      if((s$clusterRows||s$clusterColumns)&&anyNA(mat))stop("相似性排序需要完整矩阵，请补齐缺失单元格或关闭排序")
      if(s$clusterRows&&nrow(mat)>1)mat<-mat[hclust(dist(mat))$order,,drop=FALSE]
      if(s$clusterColumns&&ncol(mat)>1)mat<-mat[,hclust(dist(t(mat)))$order,drop=FALSE]
    }
    q<-as.data.frame(as.table(mat));names(q)<-c("row","column","value")
    q$row<-factor(q$row,levels=rev(rownames(mat)));q$column<-factor(q$column,levels=colnames(mat))
    plot<-ggplot(q,aes(column,row,fill=value))+geom_tile(colour=if(s$cellBorder)s$background else NA,linewidth=lw,alpha=alpha)
    if(id=="correlation"||s$normalization=="row_z")plot<-plot+scale_fill_gradient2(low=s$colorLow,mid=s$colorMid,high=s$colorHigh,midpoint=0,na.value="#C7CED4",name=if(id=="correlation")"Correlation" else "Z score")
    else plot<-plot+scale_fill_gradientn(colours=c(s$colorLow,s$colorMid,s$colorHigh),na.value="#C7CED4",name=m$value)
    if(id=="correlation")plot<-plot+geom_text(aes(label=sprintf("%.2f",value)),family=font,size=s$fontSize/3.4,colour="#20374A")
    xlab<-if(id=="correlation")"" else m$column;ylab<-if(id=="correlation")"" else m$row
  }else if(id=="volcano"){
    q<-data.frame(effect=num("effect"),p=num("p"),label=get("label",rep("",nrow(d))))
    q$class<-ifelse(q$p<s$pThreshold & q$effect>=s$effectThreshold,"Up",ifelse(q$p<s$pThreshold & q$effect<=-s$effectThreshold,"Down","Not significant"))
    q$class<-factor(q$class,levels=order_levels(q$class))
    cols<-c("Up"="#B5522A","Down"="#5B7EA6","Not significant"="#AAB5BE");for(k in names(cols))if(!is.null(p$colors[[k]]))cols[k]<-p$colors[[k]]
    outlines<-color_for(cols);names(outlines)<-names(cols)
    plot<-ggplot(q,aes(effect,-log10(p),fill=class,colour=class))+geom_point(shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha)+
      scale_fill_manual(values=cols)+scale_colour_manual(values=outlines)+geom_vline(xintercept=c(-s$effectThreshold,s$effectThreshold),linetype=2,linewidth=lw,colour="#73899B")+
      geom_hline(yintercept=-log10(s$pThreshold),linetype=2,linewidth=lw,colour="#73899B")
    if(s$labelCount>0&&!is.null(m$label)){
      labs<-head(q[q$class!="Not significant",][order(q$p[q$class!="Not significant"]),],as.integer(s$labelCount))
      plot<-plot+geom_text(data=labs,aes(label=label),colour="#2E2E33",family=font,size=s$fontSize/3.4,vjust=-.8,check_overlap=TRUE)
    }
    xlab<-"log2 fold change";ylab<-if(s$pKind=="adjusted")"-log10 adjusted P" else "-log10 P"
  }else if(id=="ma"){
    q<-data.frame(x=num("x"),effect=num("effect"))
    plot<-ggplot(q,aes(x,effect))+geom_point(shape=21,fill=s$fillColor,colour=color_for(s$fillColor),stroke=if(s$outline=="none")0 else lw,size=s$pointSize,alpha=alpha)+geom_hline(yintercept=0,linewidth=lw,linetype=2,colour="#73899B")
    if(s$logX)plot<-plot+scale_x_log10()
    xlab<-m$x;ylab<-m$effect
  }else if(id=="pca"){
    mat<-as.data.frame(lapply(d[,unlist(m$columns),drop=FALSE],as.numeric))
    pc<-prcomp(mat,center=TRUE,scale.=s$scalePca);variance<-pc$sdev^2/sum(pc$sdev^2)*100
    q<-data.frame(x=pc$x[,1],y=pc$x[,2],group=g)
    plot<-ggplot(q,aes(x,y,fill=group,colour=group))+geom_point(shape=21,size=s$pointSize*1.4,stroke=if(s$outline=="none")0 else lw,alpha=alpha)+common_scale(levels(g))
    xlab<-sprintf("PC1 (%.1f%%)",variance[1]);ylab<-sprintf("PC2 (%.1f%%)",variance[2])
  }else if(id=="enrichment"){
    q<-data.frame(term=get("term"),ratio=num("ratio"),count=num("count"),p=num("p"));q$term<-factor(q$term,levels=unique(q$term[order(q$ratio)]))
    plot<-ggplot(q,aes(ratio,term,size=count,fill=-log10(p)))+geom_point(shape=21,colour="#315F88",stroke=lw,alpha=alpha)+
      scale_size_area(max_size=s$pointSize*4,name="Hit count")+scale_fill_gradient(low=s$colorLow,high=s$colorHigh,name="-log10 P")
    xlab<-"Gene ratio";ylab<-""
  }else if(id=="forest"){
    q<-data.frame(term=get("term"),estimate=num("estimate"),lower=num("lower"),upper=num("upper"))
    q$term<-factor(q$term,levels=rev(unique(q$term)))
    plot<-ggplot(q,aes(estimate,term))+geom_vline(xintercept=s$referenceLine,linetype=2,linewidth=lw,colour="#73899B")+
      geom_segment(aes(x=lower,xend=upper,yend=term),linewidth=lw,colour="#315F88")+
      geom_point(shape=21,fill=s$fillColor,colour=color_for(s$fillColor),size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha)
    xlab<-"Estimate and supplied interval";ylab<-""
  }else if(id=="dumbbell"){
    q<-data.frame(term=get("term"),first=num("first"),second=num("second"))
    q$term<-factor(q$term,levels=rev(unique(q$term)))
    qp<-rbind(data.frame(term=q$term,value=q$first,method=m$first),data.frame(term=q$term,value=q$second,method=m$second))
    cols<-setNames(c(s$colorLow,s$colorHigh),c(m$first,m$second));out<-color_for(cols);names(out)<-names(cols)
    plot<-ggplot(q,aes(y=term))+geom_segment(aes(x=first,xend=second,yend=term),linewidth=lw,colour="#8BA0AF",alpha=alpha)+
      geom_point(data=qp,aes(x=value,fill=method,colour=method),shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha)+
      scale_fill_manual(values=cols)+scale_colour_manual(values=out)
    xlab<-"Value";ylab<-m$term
  }else if(id=="bland_altman"){
    q<-data.frame(mean=(num("first")+num("second"))/2,difference=num("second")-num("first"))
    bias<-mean(q$difference);spread<-sd(q$difference);bounds<-bias+c(-1,1)*1.96*spread
    plot<-ggplot(q,aes(mean,difference))+geom_point(shape=21,size=s$pointSize,fill=s$fillColor,colour=color_for(s$fillColor),stroke=if(s$outline=="none")0 else lw,alpha=alpha)
    if(s$showReference)plot<-plot+geom_hline(yintercept=bias,linewidth=lw,colour="#B5522A")+
      geom_hline(yintercept=bounds,linewidth=lw,linetype=2,colour="#617C90")
    analysis_result<-list(kind="Bland-Altman",n=nrow(q),difference="second-first",bias=bias,sd=spread,lower=bounds[1],upper=bounds[2])
    xlab<-"Mean of two methods";ylab<-paste0(m$second," − ",m$first)
  }else if(id=="qq"){
    q<-data.frame(value=num("value"),group=g)
    plot<-ggplot(q,aes(sample=value,fill=group,colour=group,group=group))+
      stat_qq(shape=21,size=s$pointSize,stroke=if(s$outline=="none")0 else lw,alpha=alpha)+common_scale(levels(g))
    if(s$showReference)plot<-plot+stat_qq_line(linewidth=lw,colour="#617C90")
    xlab<-"Theoretical normal quantiles";ylab<-"Observed quantiles"
  }else if(id %in% c("area","ribbon","roc","precision_recall","survival")){
    q<-data.frame(x=num("x"),y=num("y"),group=g)
    # Stable x sorting retains the supplied path order at tied thresholds.
    q$sequence<-seq_len(nrow(q))
    if(id=="ribbon"){q$lower<-num("lower");q$upper<-num("upper")}
    q<-q[order(q$group,q$x,q$sequence),]
    cols<-palette_for(levels(g));plot<-ggplot(q,aes(x,y,group=group,fill=group,colour=group))
    if(id=="area"){
      out<-color_for(cols);names(out)<-names(cols)
      plot<-plot+geom_area(position="identity",stat="identity",alpha=alpha,linewidth=lw)+scale_fill_manual(values=cols)+scale_colour_manual(values=out)
    }else{
      if(id=="ribbon")plot<-plot+geom_ribbon(aes(ymin=lower,ymax=upper),alpha=s$bandAlpha,colour=NA)
      if(id %in% c("roc","survival"))plot<-plot+geom_step(linewidth=lw,alpha=alpha,direction="hv") else plot<-plot+geom_line(linewidth=lw,alpha=alpha)
      plot<-plot+scale_fill_manual(values=cols)+scale_colour_manual(values=cols)
    }
    if(s$showPoints)plot<-plot+geom_point(shape=21,size=s$pointSize,stroke=lw,alpha=alpha)
    if(id=="roc"&&s$showReference)plot<-plot+geom_abline(slope=1,intercept=0,linetype=2,linewidth=lw,colour="#8CA1B1")
    if(id %in% c("roc","precision_recall"))plot<-plot+scale_x_continuous(breaks=seq(0,1,.2))+scale_y_continuous(breaks=seq(0,1,.2))+expand_limits(x=c(0,1),y=c(0,1))
    if(id=="survival")plot<-plot+scale_y_continuous(breaks=seq(0,1,.2))+expand_limits(y=c(0,1))
    if(id=="area")warnings_seen<<-c(warnings_seen,"Transparent series from zero; overlapping areas are not additive totals")
    xlab<-m$x;ylab<-m$y
  }else if(id=="manhattan"){
    q<-data.frame(chromosome=get("chromosome"),position=num("position"),p=num("p"))
    chromosomes<-unique(q$chromosome);numbers<-suppressWarnings(as.numeric(sub("^chr","",chromosomes,ignore.case=TRUE)))
    chromosomes<-chromosomes[order(is.na(numbers),numbers,chromosomes)]
    lengths<-vapply(chromosomes,function(k)max(q$position[q$chromosome==k])+1,0)
    gap<-max(lengths)*.04;offsets<-c(0,head(cumsum(lengths+gap),-1));names(offsets)<-chromosomes
    q$x<-q$position+offsets[q$chromosome];q$shade<-factor((match(q$chromosome,chromosomes)-1)%%2,levels=c(0,1))
    plot<-ggplot(q,aes(x,-log10(p),colour=shade))+geom_point(shape=16,size=s$pointSize,stroke=0,alpha=alpha)+
      scale_colour_manual(values=c(s$colorLow,s$colorHigh),guide="none")+
      scale_x_continuous(breaks=offsets+lengths/2,labels=chromosomes,expand=expansion(mult=.01))+expand_limits(y=0)
    if(s$showReference)plot<-plot+geom_hline(yintercept=-log10(s$associationThreshold),linewidth=lw,linetype=2,colour="#B5522A")
    xlab<-"Chromosome";ylab<-"-log10 P"
  }else if(id=="dot_matrix"){
    q<-data.frame(row=get("row"),column=get("column"),value=num("value"),size=num("size"))
    q$row<-factor(q$row,levels=rev(unique(q$row)));q$column<-factor(q$column,levels=unique(q$column))
    plot<-ggplot(q,aes(column,row,fill=value,size=size))+geom_point(shape=21,colour=color_for(s$colorHigh),stroke=if(s$outline=="none")0 else lw,alpha=alpha)+
      scale_size_area(max_size=s$pointSize*4,limits=c(0,1),breaks=c(.25,.5,.75,1),labels=scales::label_percent(),name=m$size)+
      scale_fill_gradient(low=s$colorLow,high=s$colorHigh,name=m$value)
    xlab<-m$column;ylab<-m$row
  }else if(id=="waterfall"){
    q<-data.frame(term=get("term"),value=num("value"));q<-q[order(q$value,decreasing=s$sortDirection=="descending"),]
    q$term<-factor(q$term,levels=q$term);q$direction<-ifelse(q$value>=0,"Nonnegative","Negative")
    cols<-c("Negative"=s$colorLow,"Nonnegative"=s$colorHigh);out<-color_for(cols);names(out)<-names(cols)
    plot<-ggplot(q,aes(term,value,fill=direction,colour=direction))+geom_col(width=s$width,linewidth=lw,alpha=alpha)+
      geom_hline(yintercept=0,linewidth=lw,colour="#617C90")+scale_fill_manual(values=cols)+scale_colour_manual(values=out)
    xlab<-m$term;ylab<-m$value
  }else{
    extra<-raincloud_plot(id,environment());if(is.null(extra))extra<-variant_plot(id,environment());if(is.null(extra))extra<-research_plot(id,environment());if(is.null(extra))extra<-extra_plot(id,environment());if(is.null(extra))stop("Unknown recipe")
    plot<-extra$plot;xlab<-extra$x;ylab<-extra$y;analysis_result<-extra$analysis;extra_note<-extra$note
  }
  if(nzchar(p$labels$x))xlab<-p$labels$x
  if(nzchar(p$labels$y))ylab<-p$labels$y
  fill_label<-switch(id,bin2d="Count",filled_contour=m$value,dot_matrix=m$value,enrichment="-log10 P",correlation="Correlation",heatmap=if(s$normalization=="row_z")"Z score" else m$value,NULL)
  if(!is.null(extra$fillLabel))fill_label<-extra$fillLabel
  caption<-paste(c(p$labels$note,extra_note)[nzchar(c(p$labels$note,extra_note))],collapse="\n")
  plot<-plot+labs(title=p$labels$title,x=xlab,y=ylab,caption=caption,fill=fill_label,colour=if(id=="contour")m$value else NULL)+
    theme_classic(base_size=s$fontSize,base_family=font)+
    theme(plot.background=element_rect(fill=s$background,colour=NA),
      panel.background=element_rect(fill=s$background,colour=NA),
      axis.line=element_line(linewidth=lw,colour="#2E2E33"),axis.ticks=element_line(linewidth=lw,colour="#2E2E33"),
      axis.text=element_text(colour="#2E2E33"),axis.title=element_text(colour="#2E2E33"),
      axis.title.x=element_text(margin=margin(t=s$axisTitleGap,unit="mm")),
      axis.title.y=element_text(margin=margin(r=s$axisTitleGap,unit="mm")),
      axis.ticks.length=grid::unit(s$tickLength,"mm"),
      axis.text.x=element_text(angle=as.numeric(s$axisAngle),hjust=if(as.numeric(s$axisAngle)==0).5 else 1),
      plot.title=element_text(size=s$fontSize*1.35,face="bold",hjust=.5,margin=margin(b=s$titleGap)),
      plot.caption=element_text(size=s$fontSize*.8,hjust=0,colour="#566D7C"),
      plot.margin=margin(s$marginMm,s$marginMm,s$marginMm,s$marginMm,unit="mm"),
      legend.position=s$legend,legend.background=element_rect(fill=s$background,colour=NA),
      legend.key.spacing.x=grid::unit(s$legendGap,"mm"),legend.key.spacing.y=grid::unit(s$legendGap,"mm"),
      legend.key.size=grid::unit(s$legendKeySize,"mm"),
      legend.key=element_rect(fill=s$background,colour=NA))
  inherit<-function(value,default)if(is.null(value))default else value
  plot<-plot+theme(
    panel.background=element_rect(fill=s$panelBackground,colour=NA),
    plot.title=element_text(size=inherit(s$titleSize,s$fontSize*1.35),colour=s$titleColor,face=s$titleFace,hjust=s$titleAlign,margin=margin(b=s$titleGap)),
    plot.caption=element_text(size=inherit(s$captionSize,s$fontSize*.8)),
    plot.margin=margin(inherit(s$marginTop,s$marginMm),inherit(s$marginRight,s$marginMm),inherit(s$marginBottom,s$marginMm),inherit(s$marginLeft,s$marginMm),unit="mm"),
    legend.text=element_text(size=inherit(s$legendSize,s$fontSize)),
    legend.title=if(s$legendTitleVisible)element_text(size=inherit(s$legendSize,s$fontSize)) else element_blank(),
    legend.background=element_rect(fill=s$legendBackground,colour=NA),legend.key=element_rect(fill=s$legendBackground,colour=NA),
    axis.line.x=if(s$xAxisLine)element_line(colour=s$xAxisColor,linewidth=inherit(s$xAxisLinewidth,lw),inherit.blank=TRUE) else element_blank(),
    axis.line.y=if(s$yAxisLine)element_line(colour=s$yAxisColor,linewidth=inherit(s$yAxisLinewidth,lw),inherit.blank=TRUE) else element_blank(),
    axis.ticks.x=if(s$xAxisTicks)element_line(colour=s$xAxisColor,linewidth=inherit(s$xAxisLinewidth,lw),inherit.blank=TRUE) else element_blank(),
    axis.ticks.y=if(s$yAxisTicks)element_line(colour=s$yAxisColor,linewidth=inherit(s$yAxisLinewidth,lw),inherit.blank=TRUE) else element_blank(),
    axis.ticks.length.x=grid::unit(inherit(s$xTickLength,s$tickLength),"mm"),axis.ticks.length.y=grid::unit(inherit(s$yTickLength,s$tickLength),"mm"),
    axis.text.x=if(s$xAxisLabels)element_text(size=inherit(s$xAxisFontSize,s$fontSize),colour=s$xAxisColor,angle=as.numeric(s$axisAngle),hjust=if(as.numeric(s$axisAngle)==0).5 else 1,inherit.blank=TRUE) else element_blank(),
    axis.text.y=if(s$yAxisLabels)element_text(size=inherit(s$yAxisFontSize,s$fontSize),colour=s$yAxisColor,angle=s$yAxisAngle,inherit.blank=TRUE) else element_blank(),
    axis.title.x=element_text(size=inherit(s$xAxisTitleSize,s$fontSize),colour=s$xAxisColor,margin=margin(t=inherit(s$xAxisTitleGap,s$axisTitleGap),unit="mm"),inherit.blank=TRUE),
    axis.title.y=element_text(size=inherit(s$yAxisTitleSize,s$fontSize),colour=s$yAxisColor,margin=margin(r=inherit(s$yAxisTitleGap,s$axisTitleGap),unit="mm"),inherit.blank=TRUE))
  if(!s$titleVisible)plot<-plot+labs(title=NULL)
  if(s$xGrid)plot<-plot+theme(panel.grid.major.x=element_line(colour=s$gridColor,linewidth=inherit(s$gridWidth,lw)))
  if(s$yGrid)plot<-plot+theme(panel.grid.major.y=element_line(colour=s$gridColor,linewidth=inherit(s$gridWidth,lw)))
  if(s$grid)plot<-plot+theme(panel.grid.major=element_line(colour=s$gridColor,linewidth=inherit(s$gridWidth,lw)))
  if(id %in% c("radar","pie","donut","treemap","sankey","network","ternary"))plot<-plot+theme(axis.line=element_blank(),axis.text=element_blank(),axis.text.x=element_blank(),axis.text.y=element_blank(),axis.ticks=element_blank(),axis.title=element_blank(),axis.title.x=element_blank(),axis.title.y=element_blank(),panel.grid=element_blank())
  if(!is.null(extra$theme))plot<-plot+extra$theme
  # Coordinate limits zoom the already-computed geometry; they never filter observations.
  x_enabled<-!id %in% c("heatmap","correlation","dot_matrix","violin","box","bar","strip","raincloud","paired","grouped_bar","stacked_bar","percent_bar","lollipop","mean_interval","waterfall","manhattan")
  y_enabled<-!id %in% c("heatmap","correlation","dot_matrix","dumbbell","forest","enrichment")
  if(!is.null(extra)){x_enabled<-"x" %in% extra$axes;y_enabled<-"y" %in% extra$axes}
  limit_pair<-function(a,b){if(is.null(a)&&is.null(b))NULL else c(if(is.null(a))NA_real_ else a,if(is.null(b))NA_real_ else b)}
  xlim<-if(x_enabled)limit_pair(s$xMin,s$xMax) else NULL;ylim<-if(y_enabled)limit_pair(s$yMin,s$yMax) else NULL
  if(!is.null(xlim)||!is.null(ylim))plot<-plot+coord_cartesian(xlim=xlim,ylim=ylim,
    expand=c(bottom=is.null(ylim)||is.na(ylim[1]),top=is.null(ylim)||is.na(ylim[2]),
      left=is.null(xlim)||is.na(xlim[1]),right=is.null(xlim)||is.na(xlim[2])))
  built_plot<-ggplot_build(plot);built_axes<-built_plot$layout$panel_params[[1]]
  if(id=="hexbin")analysis_result$binCounts<-built_plot$data[[1]][,c("x","y","count"),drop=FALSE]
  if(isTRUE(as_grob))return(list(grob=ggplot_gtable(built_plot),recipe=id,rows=nrow(d),font=font,analysis=analysis_result,warnings=warnings_seen))
  # Explicit devices, shared plot object and dimensions for preview and export.
  width<-s$widthMm/25.4;height<-s$heightMm/25.4
  # Windows bitmap strikes in some fonts can disappear in ragg at small sizes.
  # Cairo preserves those glyphs without changing the requested font, size or DPI.
  cairo_raster<-.Platform$OS.type=="windows"&&capabilities("cairo")
  device_name<-if(format=="svg")"svglite" else if(format=="pdf")"cairo_pdf" else if(cairo_raster)paste0("cairo_",format) else paste0("ragg_",format)
  if(format=="svg")svglite::svglite(output,width=width,height=height,bg=s$background)
  else if(format=="pdf")grDevices::cairo_pdf(output,width=width,height=height,family=font,bg=s$background)
  else if(format=="png"){
    if(cairo_raster)grDevices::png(output,width=width,height=height,units="in",res=as.numeric(s$dpi),bg=s$background,type="cairo",family=font,antialias="gray")
    else ragg::agg_png(output,width=width,height=height,units="in",res=as.numeric(s$dpi),background=s$background)
  }
  else if(format=="tiff"){
    if(cairo_raster)grDevices::tiff(output,width=width,height=height,units="in",res=as.numeric(s$dpi),bg=s$background,type="cairo",family=font,compression="lzw",antialias="gray")
    else ragg::agg_tiff(output,width=width,height=height,units="in",res=as.numeric(s$dpi),background=s$background,compression="lzw")
  }
  else stop("Unsupported device")
  grid::grid.newpage();grid::grid.draw(ggplot_gtable(built_plot));dev.off()
  font_path<-systemfonts::match_fonts(font)$path[1]
  metadata<-list(renderer="R / ggplot2",R=as.character(getRversion()),ggplot2=as.character(packageVersion("ggplot2")),
    recipe=id,recipeVersion=1,rows=nrow(d),fontRequested=font,fontUsed=font,fontFile=basename(font_path),
    format=format,device=device_name,widthMm=s$widthMm,heightMm=s$heightMm,dpi=as.numeric(s$dpi),linewidth=s$linewidth,
    linewidthUnit="ggplot",seed=1729,warnings=warnings_seen,analysis=analysis_result,
    viewLimits=list(x=xlim,y=ylim),groupOrder=unlist(p$groupOrder),axisTitleGap=s$axisTitleGap,
    displayRanges=list(x=built_axes$x.range,y=built_axes$y.range),
    renderLabels=list(x=xlab,y=ylab,title=p$labels$title,note=p$labels$note),
    legendGap=s$legendGap,legendKeySize=s$legendKeySize,tickLength=s$tickLength)
  write_json(metadata,paste0(output,".json"),auto_unbox=TRUE,pretty=TRUE)
}
# INLINE_COMPOSITION
if(!exists("render_composition"))source(file.path(dirname(script_path),"composition.R"))
execute <- function(argv) {
  if(argv[1]=="--warmup")return(invisible(NULL))
  input <<- fromJSON(argv[1],simplifyVector=FALSE); output <<- argv[2]; format <<- argv[3]; warnings_seen <<- character()
  withCallingHandlers(if(identical(input$kind,"figure-composition"))render_composition() else render(),warning=function(w){warnings_seen<<-c(warnings_seen,conditionMessage(w));invokeRestart("muffleWarning")})
}
if(args[1]=="--library") invisible(NULL) else if(args[1]=="--worker") {
  incoming <- file("stdin","r"); completed <- 0L
  repeat {
    line <- readLines(incoming,n=1,warn=FALSE);if(!length(line))break
    request <- fromJSON(line,simplifyVector=TRUE); started <- proc.time()[[3]]
    result <- tryCatch({execute(request$args);list(id=request$id,ok=TRUE,warm=completed>0,ms=round((proc.time()[[3]]-started)*1000))},
      error=function(e){graphics.off();list(id=request$id,ok=FALSE,error=conditionMessage(e))})
    completed <- completed+1L
    cat("@@FIGURE@@",toJSON(result,auto_unbox=TRUE),"\n",sep="");flush(stdout())
  }
  close(incoming)
} else tryCatch(execute(args),error=function(e){cat(conditionMessage(e),file=stderr());quit(save="no",status=1)})
