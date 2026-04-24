import { View, Image, TouchableOpacity } from 'react-native';
import { AppText, semanticColors, Spacer } from './elements';
import FadeInView from './FadeInView';
import { fTranslate, translate } from './lang';
import { SvgIcon } from './svg-icons';
import { getRowDirection, getRowReverseDirection, isRTL } from './lang';
import React, { useCallback } from 'react';
import { trace } from './log';
import { normalizeFoAndroid } from './canvas/utils';
import { MyIcon } from './common/icons';
import { FontWeight } from '@shopify/react-native-skia';

export function FileContextMenu({
  width,
  height,
  windowSize,
  item,
  folder,
  isLandscape,
  open,
  onClose,
  inFoldersMode,

  onDeletePage,
  deletePageIndex,
  pagesCount,
  onDelete,
  onRename,
  onMove,
  onShareImgs,
  onSharePDF,
  onShareIssieDocs,
  onShareFolder,
  shareCaption,
  onDuplicate,

  onSaveAsTemplate,
  onEditTemplate,
  isTemplate,

  onAddFromCamera,
  onAddFromMediaLib,
  onBlankPage,
  onLinesPage,
  onMathPage,

  // Page editing actions
  onUndoAll,
  onLockPage,
  onUnlockPage,
  hasLock,
}) {
  if (!open) {
    return <View />;
  }

  // Support both item (file) and folder
  const isFolder = !!folder;
  const displayItem = item || folder;

  console.log('FileContextMenu DEBUG:', {
    isFolder,
    folderName: folder?.name,
    itemName: item?.name,
    hasOnAddFromCamera: !!onAddFromCamera,
    hasOnAddFromMediaLib: !!onAddFromMediaLib,
    hasOnBlankPage: !!onBlankPage,
    hasOnLinesPage: !!onLinesPage,
    hasOnMathPage: !!onMathPage,
    hasOnShareFolder: !!onShareFolder,
  });
  trace('FileContextMenu - isFolder:', isFolder, 'item:', displayItem?.name);

  //return <View style={{position:"absolute", zIndex: 100, left:100, width:100, height:100, backgroundColor:"green"}}/>

  const callbackAndClose = useCallback(
    callback => () => {
      onClose();
      if (callback) callback();
    },
    [onClose],
  );

  // Recalculate isLandscape based on windowSize dimensions, not the scaled menu width/height
  const actualIsLandscape = windowSize ? windowSize.width > windowSize.height : width > height;
  const scale = actualIsLandscape ? .6 : .75;

  console.log('FileContextMenu render - windowSize:', windowSize, 'width:', width, 'height:', height, 'actualIsLandscape:', actualIsLandscape);

  trace('fcm', width, height, 'landscape:', actualIsLandscape);
  const menuHeight = Math.floor(height);
  const menuGroupWidth = actualIsLandscape ? '46%' : '90%';

  //return <View style={{position:"absolute", zIndex: 100, left:100, width:100, height:100, backgroundColor:"green"}}/>
  return (
    <TouchableOpacity
      style={{
        position: 'absolute',
        zIndex: 200000,
        top: 0,
        width: '100%',
        height: '100%',
        alignItems: "center",
        justifyContent: "flex-end",
      }}
      onPress={onClose}
    >
      <FadeInView
        style={{
          bottom: 0,
          backgroundColor: 'white',
          zIndex: 200000,
          width,
          //left: '12.5%',
          shadowColor: '#171717',
          shadowOffset: { width: 3, height: -5 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          borderTopLeftRadius: 15,
          borderTopRightRadius: 15,
        }}
        overflow={'visible'}
        height={open ? menuHeight : 0}
        duration={400}
      >
        {/** Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={[
            {
              position: 'absolute',
              top: 8,
              width: 40,
              height: 40,
              zIndex: 101,
            },
            isRTL() ? { left: 8 } : { right: 8 },
          ]}
        >
          <MyIcon info={{ name: 'close', size: 30 }} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={1}
          style={{ height: '100%', width: '100%' }}
        >
          {/**title */}
          <View
            style={{
              flexDirection: getRowReverseDirection(),
              alignItems: 'center',
              padding: 15 * scale,
            }}
          >
            {isFolder ? (
              <MyIcon
                info={{
                  name: 'folder',
                  size: 70 * scale,
                  color: folder.color || semanticColors.titleText,
                }}
              />
            ) : (
              <Image
                source={normalizeFoAndroid({ uri: item.thumbnail })}
                style={{
                  height: 70 * scale,
                  width: 50 * scale,
                  resizeMode: 'stretch',
                  borderColor: 'gray',
                  borderWidth: 1,
                }}
              />
            )}
            <Spacer width={10 * scale} />
            <AppText
              style={{ fontSize: 38 * scale, width: width - 100, fontWeight:"600" }}
              ellipsizeMode={true}
            >
              {displayItem.name}
            </AppText>
          </View>

          <Seperator />

          <View
            style={{
              flexDirection: actualIsLandscape ? 'row' : 'column',
              flexWrap: actualIsLandscape ? 'wrap' : 'nowrap',
              alignItems: actualIsLandscape ? 'flex-start' : 'center',
              justifyContent: 'center',
              width: "100%",
              paddingTop: 10,
            }}
          >
            {/** Menu */}
            <MenuGroup scale={scale} width={menuGroupWidth}>
              {onRename && (
                <React.Fragment>
                  <OneMenu
                    scale={scale}
                    icon="edit"
                    onPress={callbackAndClose(onRename)}
                    text={translate('BtnChangeName')}
                  />
                  <Seperator95 />
                </React.Fragment>
              )}
              {onDeletePage && (
                <React.Fragment>
                  <OneMenu
                    scale={scale}
                    icon="delete-forever"
                    onPress={callbackAndClose(onDeletePage)}
                    text={fTranslate(
                      'BeforeDeleteSubPageMenu',
                      deletePageIndex,
                      pagesCount,
                    )}
                  />
                  <Seperator95 />
                </React.Fragment>
              )}
              {inFoldersMode && onDelete && (
                <React.Fragment>
                  <OneMenu
                    scale={scale}
                    icon="delete-forever"
                    onPress={callbackAndClose(onDelete)}
                    text={translate('BtnDelete')}
                  />
                  <Seperator95 />
                </React.Fragment>
              )}
              {onMove && (
                <React.Fragment>
                  <OneMenu
                    scale={scale}
                    icon="folder-move"
                    iconType={'MDI'}
                    onPress={callbackAndClose(onMove)}
                    text={translate('BtnMove')}
                  />
                  <Seperator95 />
                </React.Fragment>
              )}
              {onDuplicate && (
                <React.Fragment>
                  <OneMenu
                    scale={scale}
                    icon="file-multiple"
                    iconType={'MDI'}
                    onPress={callbackAndClose(onDuplicate)}
                    text={translate('BtnDuplicate')}
                  />
                  <Seperator95 />
                </React.Fragment>
              )}
              {onSaveAsTemplate && !isTemplate && (
                <React.Fragment>
                  <OneMenu
                    scale={scale}
                    icon="file-document-check"
                    iconType={'MDI'}
                    onPress={callbackAndClose(onSaveAsTemplate)}
                    text={translate('BtnSaveAsTemplate')}
                  />
                  <Seperator95 />
                </React.Fragment>
              )}
              {onEditTemplate && isTemplate && (
                <React.Fragment>
                  <OneMenu
                    scale={scale}
                    icon="file-document-edit"
                    iconType={'MDI'}
                    onPress={callbackAndClose(onEditTemplate)}
                    text={translate('BtnEditTemplate')}
                  />
                  <Seperator95 />
                </React.Fragment>
              )}
              {onUndoAll && (
                <React.Fragment>
                  <OneMenu
                    scale={scale}
                    icon="undo-variant"
                    iconType={'MDI'}
                    onPress={callbackAndClose(onUndoAll)}
                    text={translate('BtnUndoAll')}
                  />
                  <Seperator95 />
                </React.Fragment>
              )}

              {/* {onLockPage && !hasLock && (
                <React.Fragment>
                  <OneMenu
                    scale={scale}
                    icon="lock"
                    onPress={callbackAndClose(onLockPage)}
                    text={translate('BtnLockChanges')}
                  />
                  <Seperator />
                </React.Fragment>
              )}

              {onUnlockPage && hasLock && (
                <React.Fragment>
                  <OneMenu
                    scale={scale}
                    icon="lock-open"
                    onPress={callbackAndClose(onUnlockPage)}
                    text={translate('BtnUnlockChanges')}
                  />
                  <Seperator />
                </React.Fragment>
              )} */}

            </MenuGroup>

            {(onShareImgs || onSharePDF || onShareIssieDocs || onShareFolder) &&
              <MenuGroup width={menuGroupWidth}
                title={translate('ShareMenuTitle')}
                scale={scale}
              >
                {onShareImgs &&
                  <>
                    <OneMenu
                      scale={scale}
                      icon="image"
                      onPress={callbackAndClose(onShareImgs)}
                      text={translate('BtnShareAsImages')}
                    />
                    <Seperator95 />
                  </>
                }
                {onSharePDF &&
                  <>
                    <OneMenu
                      scale={scale}
                      icon="picture-as-pdf"
                      onPress={callbackAndClose(onSharePDF)}
                      text={translate('BtnShareAsPDF')}
                    />
                    <Seperator95 />
                  </>
                }
                {onShareIssieDocs &&
                  <>
                    <OneMenu
                      scale={scale}
                      icon="ios-share"
                      onPress={callbackAndClose(onShareIssieDocs)}
                      text={translate('BtnShareIssieDocs')}
                    />
                    <Seperator95 />
                  </>
                }
                {onShareFolder &&
                  <>
                    <OneMenu
                      scale={scale}
                      icon="share"
                      onPress={callbackAndClose(onShareFolder)}
                      text={shareCaption || translate('BtnShareFolder')}
                    />
                    <Seperator95 />
                  </>
                }
              </MenuGroup>
            }

            {!isFolder && (
              <MenuGroup
                scale={scale}
                width={menuGroupWidth}
                title={translate('AddPageMenuTitle')}
                icon="menu-new-empty-page"
                iconType="svg"
              >
                {onAddFromCamera && (
                  <>
                    <OneMenu
                      scale={scale}
                      icon="new-camera"
                      iconType={'svg'}
                      onPress={callbackAndClose(onAddFromCamera)}
                      text={translate('MenuFromCamera')}
                    />
                    <Seperator95 />
                  </>
                )}
                {onAddFromMediaLib && (
                  <>
                    <OneMenu
                      scale={scale}
                      icon="new-image"
                      iconType={'svg'}
                      onPress={callbackAndClose(onAddFromMediaLib)}
                      text={translate('MenuFromMediaLib')}
                    />
                    <Seperator95 />
                  </>
                )}
                {onBlankPage && (
                  <>
                    <OneMenu
                      scale={scale}
                      icon="page-empty"
                      iconType={'svg'}
                      onPress={callbackAndClose(onBlankPage)}
                      text={translate('MenuNewPageEmpty')}
                    />
                    <Seperator95 />
                  </>
                )}
                {onLinesPage && (
                  <>
                    <OneMenu
                      scale={scale}
                      icon="page-lines"
                      iconType={'svg'}
                      onPress={callbackAndClose(onLinesPage)}
                      text={translate('MenuNewPageLines')}
                    />
                    <Seperator95 />
                  </>
                )}
                {onMathPage && (
                  <>
                    <OneMenu
                      scale={scale}
                      icon="page-math"
                      iconType={'svg'}
                      onPress={callbackAndClose(onMathPage)}
                      text={translate('MenuNewPageMath')}
                    />
                    <Seperator95 />
                  </>
                )}
              </MenuGroup>
            )}

          </View>
        </TouchableOpacity>
      </FadeInView>
    </TouchableOpacity>
  );
}

function MenuGroup(props) {
  return (
    <View
      style={{
        flexDirection: 'column',
        margin: 20 * props.scale,
        backgroundColor: '#F1F2F4',
        borderRadius: 10,
        width: props.width,
        paddingBottom: 5,
      }}
    >
      {props.title && (
        <View style={{ marginHorizontal: 15, minHeight: 30 , justifyContent:"center"}}>
          <AppText style={{ fontSize: 35 * props.scale , fontWeight:"500"}}>
            {props.title}:
          </AppText>
        </View>
      )}
      {props.title && <Seperator />}
      {props.children}
    </View>
  );
}

function OneMenu({ icon, iconType, onPress, text, scale }) {
  iconType = iconType || 'MI';
  return (
    <TouchableOpacity
      style={{
        flexDirection: getRowDirection(),
        justifyContent: 'space-between',
        marginVertical: 10 * scale,
        marginHorizontal: 20,
      }}
      onPress={onPress}
    >
      {iconType === 'svg' ? (
        <SvgIcon
          name={icon}
          size={40 * scale}
          color={semanticColors.titleText}
        />
      ) : (
        <MyIcon
          info={{
            type: iconType,
            name: icon,
            size: 40 * scale,
            color: semanticColors.titleText,
          }}
        />
      )}
      <AppText style={{ fontSize: 30 * scale }}>{text}</AppText>
    </TouchableOpacity>
  );
}

function Seperator() {
  return (
    <View
      style={{
        marginTop: 4,
        borderBottomColor: 'gray',
        borderBottomWidth: 1,
      }}
    />
  );
}

function Seperator95() {
  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      <View
        style={{
          width: "95%",
          marginTop: 4,
          borderBottomColor: 'lightgray',
          borderBottomWidth: 1,
        }}
      />
    </View>
  );
}
