# Reuse the same ggplot objects used by single figures, never stitch screenshots.
render_composition <- function() {
  specification <- input; settings <- specification$layout
  original_input <- input
  on.exit({input <<- original_input},add=TRUE)
  if(!settings$labelFont %in% available_fonts$family)stop(paste0("Font unavailable: ",settings$labelFont))
  n <- length(specification$panels);cols<-min(settings$columns,n);rows<-ceiling(n/cols)
  width<-settings$widthMm/25.4;height<-settings$heightMm/25.4;font<-settings$labelFont;bg<-settings$background
  cairo_raster<-.Platform$OS.type=="windows"&&capabilities("cairo")
  if(format=="svg")svglite::svglite(output,width=width,height=height,bg=bg)
  else if(format=="pdf")grDevices::cairo_pdf(output,width=width,height=height,family=font,bg=bg)
  else if(format=="png"){
    if(cairo_raster)grDevices::png(output,width=width,height=height,units="in",res=settings$dpi,bg=bg,type="cairo",family=font,antialias="gray")
    else ragg::agg_png(output,width=width,height=height,units="in",res=settings$dpi,background=bg)
  } else if(format=="tiff"){
    if(cairo_raster)grDevices::tiff(output,width=width,height=height,units="in",res=settings$dpi,bg=bg,type="cairo",family=font,compression="lzw",antialias="gray")
    else ragg::agg_tiff(output,width=width,height=height,units="in",res=settings$dpi,background=bg,compression="lzw")
  } else stop("Unsupported composition device")
  on.exit(dev.off(),add=TRUE)
  parts <- lapply(specification$panels,function(panel){
    input <<- panel$project;warnings_seen <<- character()
    withCallingHandlers(render(as_grob=TRUE),warning=function(w){warnings_seen<<-c(warnings_seen,conditionMessage(w));invokeRestart("muffleWarning")})
  })
  if(isTRUE(settings$alignPanels)&&length(unique(vapply(parts,function(p)length(p$grob$widths),integer(1))))==1L){
    widths <- Reduce(function(a,b)grid::unit.pmax(a,b),lapply(parts,function(p)p$grob$widths))
    parts <- lapply(parts,function(p){p$grob$widths<-widths;p})
  }
  grid::grid.newpage()
  cw<-(settings$widthMm-2*settings$marginMm-(cols-1)*settings$gapMm)/cols
  ch<-(settings$heightMm-2*settings$marginMm-(rows-1)*settings$gapMm)/rows
  label_band<-if(isTRUE(settings$labels))settings$labelSize*25.4/72+2 else 0
  for(i in seq_along(parts)){
    x<-settings$marginMm+((i-1)%%cols)*(cw+settings$gapMm)
    y<-settings$heightMm-settings$marginMm-floor((i-1)/cols)*(ch+settings$gapMm)
    grid::pushViewport(grid::viewport(x=grid::unit(x,"mm"),y=grid::unit(y,"mm"),width=grid::unit(cw,"mm"),height=grid::unit(ch,"mm"),just=c("left","top")))
    if(isTRUE(settings$labels))grid::grid.text(LETTERS[i],x=grid::unit(1,"mm"),y=grid::unit(1,"npc")-grid::unit(1,"mm"),just=c("left","top"),gp=grid::gpar(fontfamily=font,fontsize=settings$labelSize,fontface="bold",col="#213B50"))
    grid::pushViewport(grid::viewport(x=0,y=0,width=1,height=grid::unit(ch-label_band,"mm"),just=c("left","bottom")))
    grid::grid.draw(parts[[i]]$grob);grid::popViewport(2)
  }
  metadata<-list(renderer="R / ggplot2 / grid",kind="figure-composition",R=as.character(getRversion()),ggplot2=as.character(packageVersion("ggplot2")),widthMm=settings$widthMm,heightMm=settings$heightMm,format=format,dpi=settings$dpi,layout=settings,panels=lapply(seq_along(parts),function(i){p<-parts[[i]];p$grob<-NULL;p$id<-specification$panels[[i]]$id;p$label<-LETTERS[i];p}))
  write_json(metadata,paste0(output,".json"),auto_unbox=TRUE,pretty=TRUE,null="null")
}
